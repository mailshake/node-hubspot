const { expect } = require('chai')
const fakeHubspotApi = require('./helpers/fake_hubspot_api')
const { createTestContact, deleteTestContact } = require('./helpers/factories')

const Hubspot = require('..')

describe('contacts', function() {
  const hubspot = new Hubspot({
    accessToken: process.env.ACCESS_TOKEN || 'fake-token',
  })

  describe('get', function() {
    const count = 10
    // v3 endpoint: GET /crm/v3/objects/contacts
    const contactsGetEndpoint = {
      path: '/crm/v3/objects/contacts',
      response: {
        results: [{ id: '123', properties: { email: 'test@test.com' } }],
      },
    }
    const tenContactsGetEndpoint = {
      path: '/crm/v3/objects/contacts',
      response: {
        results: Array(10)
          .fill()
          .map((_, i) => ({ id: String(i), properties: {} })),
        paging: { next: { after: '10' } },
      },
      query: { limit: count },
    }
    fakeHubspotApi.setupServer({
      getEndpoints: [contactsGetEndpoint, tenContactsGetEndpoint],
    })

    it('should return a batch of contacts', function() {
      return hubspot.contacts.get().then(data => {
        expect(data).to.be.a('object')
        expect(data.contacts).to.be.a('array')
        expect(data.contacts[0]).to.be.an('object')
        // Verify v1 format: vid instead of id
        expect(data.contacts[0].vid).to.equal(123)
      })
    })

    it('should pass through a count', function() {
      return hubspot.contacts.get({ count }).then(data => {
        expect(data).to.be.a('object')
        expect(data.contacts).to.be.a('array')
        expect(data['has-more']).to.equal(true)
        expect(data['vid-offset']).to.equal(10)
      })
    })
  })

  describe('getRecentlyModified', function() {
    // v3: Uses search with sort
    const recentlyModifiedContactsEndpoint = {
      path: '/crm/v3/objects/contacts/search',
      request: {
        sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
        limit: 100,
      },
      response: {
        results: [{ id: '123', properties: { email: 'test@test.com' } }],
      },
    }
    fakeHubspotApi.setupServer({
      postEndpoints: [recentlyModifiedContactsEndpoint],
    })

    it('should return a list of contacts', function() {
      return hubspot.contacts.getRecentlyModified().then(data => {
        expect(data.contacts).to.be.an('array')
        expect(data.contacts[0].vid).to.equal(123)
      })
    })
  })

  describe('getRecentlyCreated', function() {
    // v3: Uses search with sort
    const recentlyCreatedContactsEndpoint = {
      path: '/crm/v3/objects/contacts/search',
      request: {
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        limit: 100,
      },
      response: {
        results: [{ id: '456', properties: { email: 'new@test.com' } }],
      },
    }
    fakeHubspotApi.setupServer({
      postEndpoints: [recentlyCreatedContactsEndpoint],
    })

    it('should return a list of contacts', function() {
      return hubspot.contacts.getRecentlyCreated().then(data => {
        expect(data.contacts).to.be.an('array')
        expect(data.contacts[0].vid).to.equal(456)
      })
    })
  })

  describe('getById', function() {
    let contactId = 123
    // v3: GET /crm/v3/objects/contacts/{id}
    const contactByIdEndpoint = {
      path: `/crm/v3/objects/contacts/${contactId}`,
      response: {
        id: String(contactId),
        properties: { email: 'test@test.com' },
      },
    }
    fakeHubspotApi.setupServer({ getEndpoints: [contactByIdEndpoint] })

    before(function() {
      if (process.env.NOCK_OFF) {
        return createTestContact(hubspot).then(data => (contactId = data.vid))
      }
    })
    after(function() {
      if (process.env.NOCK_OFF) {
        return deleteTestContact(hubspot, contactId)
      }
    })

    it('should return a contact based on its id', function() {
      return hubspot.contacts.getById(contactId).then(data => {
        expect(data.vid).to.equal(contactId)
      })
    })
  })

  describe('getByIdBatch', function() {
    let contactIds = [123, 234, 345]
    // v3: POST /crm/v3/objects/contacts/batch/read
    const contactsByIdsEndpoint = {
      path: '/crm/v3/objects/contacts/batch/read',
      request: {
        inputs: contactIds.map(id => ({ id: String(id) })),
      },
      response: {
        results: contactIds.map(id => ({ id: String(id), properties: {} })),
      },
    }
    fakeHubspotApi.setupServer({ postEndpoints: [contactsByIdsEndpoint] })

    before(function() {
      if (process.env.NOCK_OFF) {
        return hubspot.contacts.get({ count: 3 }).then(data => {
          contactIds = data.contacts.map(contact => contact.vid)
        })
      }
    })

    it('should return a contact record based on a array of ids', function() {
      return hubspot.contacts.getByIdBatch(contactIds).then(data => {
        expect(data).to.be.an('object')
        expect(data).to.have.a.property(contactIds[0])
      })
    })
  })

  describe('getByEmail', function() {
    let email = 'testingapis@hubspot.com'
    // v3: GET /crm/v3/objects/contacts/{email}?idProperty=email
    const contactByEmailEndpoint = {
      path: `/crm/v3/objects/contacts/${encodeURIComponent(email)}`,
      query: { idProperty: 'email' },
      response: { id: '123', properties: { email: email } },
    }
    fakeHubspotApi.setupServer({ getEndpoints: [contactByEmailEndpoint] })

    it('should return a contact record based on the email', function() {
      return hubspot.contacts.getByEmail(email).then(data => {
        expect(data).to.be.a('object')
        expect(data.vid).to.equal(123)
        expect(data.properties).to.be.a('object')
        expect(data.properties.email.value).to.equal(email)
      })
    })
  })

  describe('getByEmailBatch', function() {
    let emails = [
      'testingapis@hubspot.com',
      'testingapisawesomeandstuff@hubspot.com',
    ]
    // v3: POST /crm/v3/objects/contacts/batch/read with idProperty
    const contactByEmailsEndpoint = {
      path: '/crm/v3/objects/contacts/batch/read',
      request: {
        idProperty: 'email',
        inputs: emails.map(email => ({ id: email })),
      },
      response: {
        results: emails.map((email, i) => ({
          id: String(i + 100),
          properties: { email: email },
        })),
      },
    }
    fakeHubspotApi.setupServer({ postEndpoints: [contactByEmailsEndpoint] })

    it('should return a contact record based on a array of emails', function() {
      return hubspot.contacts.getByEmailBatch(emails).then(data => {
        expect(data).to.be.an('object')
        // v1 format: keyed by vid
        expect(Object.keys(data).length).to.equal(2)
      })
    })
  })

  describe('update', function() {
    let contactId = 123
    const updateData = {
      properties: [
        {
          property: 'email',
          value: `new-email${Date.now()}@hubspot.com`,
        },
        {
          property: 'firstname',
          value: 'Updated',
        },
        {
          property: 'lastname',
          value: 'Lead',
        },
        {
          property: 'website',
          value: 'http://hubspot-updated-lead.com',
        },
        {
          property: 'lifecyclestage',
          value: 'customer',
        },
      ],
    }
    // v3: PATCH /crm/v3/objects/contacts/{id}
    // Note: v3 expects properties as object, not array
    const updateContactEndpoint = {
      path: `/crm/v3/objects/contacts/${contactId}`,
      response: { id: String(contactId), properties: {} },
    }
    fakeHubspotApi.setupServer({ patchEndpoints: [updateContactEndpoint] })

    before(function() {
      if (process.env.NOCK_OFF) {
        return hubspot.contacts.get().then(data => {
          contactId = data.contacts[0].vid
        })
      }
    })

    it('should update an existing contact', function() {
      return hubspot.contacts.update(contactId, updateData).then(data => {
        expect(data).to.be.an('undefined')
      })
    })
  })

  describe('createOrUpdate', function() {
    const email = 'test@hubspot.com'
    const createOrUpdateData = {
      properties: [
        {
          property: 'email',
          value: email,
        },
        {
          property: 'firstname',
          value: 'Matt',
        },
        {
          property: 'lastname',
          value: 'Schnitt',
        },
      ],
    }
    // v3: POST /crm/v3/objects/contacts/batch/upsert
    const createOrUpdateContactEndpoint = {
      path: '/crm/v3/objects/contacts/batch/upsert',
      response: {
        results: [{ id: '123', properties: { email: email } }],
      },
    }
    fakeHubspotApi.setupServer({
      postEndpoints: [createOrUpdateContactEndpoint],
    })

    it('should Create or Update a contact', function() {
      return hubspot.contacts
        .createOrUpdate(email, createOrUpdateData)
        .then(data => {
          expect(data).to.be.an('object')
          expect(data.vid).to.equal(123)
        })
    })
  })

  describe('create', function() {
    const companyName = 'MadKudu'
    const testEmail = 'node-hubspot-test@madkudu.com'
    const createData = {
      properties: [
        {
          property: 'email',
          value: testEmail,
        },
        {
          property: 'firstname',
          value: 'Try',
        },
        {
          property: 'lastname',
          value: 'MadKudu',
        },
        {
          property: 'website',
          value: 'http://www.madkudu.com',
        },
        {
          property: 'company',
          value: companyName,
        },
      ],
    }
    const createErrorData = {
      properties: [
        {
          property: 'email',
          value: 'node-hubspot@hubspot.com',
        },
        {
          property: 'firstname',
          value: 'Test',
        },
      ],
    }
    // v3: POST /crm/v3/objects/contacts
    // Note: v3 expects properties as object, so we match against converted format
    const createContactEndpoint = {
      path: '/crm/v3/objects/contacts',
      request: {
        properties: {
          email: testEmail,
          firstname: 'Try',
          lastname: 'MadKudu',
          website: 'http://www.madkudu.com',
          company: companyName,
        },
      },
      response: { id: '789', properties: { company: companyName } },
    }
    const createExisitingContactEndpoint = {
      path: '/crm/v3/objects/contacts',
      request: {
        properties: {
          email: 'node-hubspot@hubspot.com',
          firstname: 'Test',
        },
      },
      responseError: 'Contact already exists',
    }
    fakeHubspotApi.setupServer({
      postEndpoints: [createContactEndpoint, createExisitingContactEndpoint],
    })

    it('should create a new contact', function() {
      return hubspot.contacts.create(createData).then(data => {
        expect(data).to.be.an('object')
        expect(data.vid).to.equal(789)
        expect(data.properties.company.value).to.equal('MadKudu')
      })
    })

    it('should fail if the contact already exists', function() {
      return hubspot.contacts
        .create(createErrorData)
        .then(data => {
          throw new Error('This should have failed')
        })
        .catch(err => {
          expect(err instanceof Error).to.equal(true)
          // nock replyWithError wraps the message
          expect(err.message).to.include('Contact already exists')
        })
    })
  })

  describe('delete', function() {
    let contactId = 123
    // v3: DELETE /crm/v3/objects/contacts/{id}
    const deleteContactEndpoint = {
      path: `/crm/v3/objects/contacts/${contactId}`,
      response: {},
    }
    fakeHubspotApi.setupServer({ deleteEndpoints: [deleteContactEndpoint] })

    before(function() {
      if (process.env.NOCK_OFF) {
        return createTestContact(hubspot).then(data => (contactId = data.vid))
      }
    })

    it('can delete', function() {
      return hubspot.contacts.delete(contactId).then(data => {
        expect(data).to.be.an('object')
      })
    })
  })

  describe('createOrUpdateBatch', function() {
    const contactIds = [123, 234, 345]
    const properties = [{ property: 'company', value: 'MadKudu ' }]
    let createOrUpdateData = contactIds.map(vid => ({ vid, properties }))
    // v3: POST /crm/v3/objects/contacts/batch/upsert
    const createOrUpdateContactsEndpoint = {
      path: '/crm/v3/objects/contacts/batch/upsert',
      response: { results: [] },
    }
    fakeHubspotApi.setupServer({
      postEndpoints: [createOrUpdateContactsEndpoint],
    })

    before(function() {
      if (process.env.NOCK_OFF) {
        return hubspot.contacts.get({ count: 3 }).then(data => {
          createOrUpdateData = data.contacts.map(({ vid }) => ({
            vid,
            properties,
          }))
        })
      }
    })

    it('should update a batch of company', function() {
      return hubspot.contacts
        .createOrUpdateBatch(createOrUpdateData)
        .then(data => {
          expect(data).to.equal(undefined)
        })
    })
  })

  describe('search', function() {
    const query = 'example'
    // v3: POST /crm/v3/objects/contacts/search
    const searchContactsEndpoint = {
      path: '/crm/v3/objects/contacts/search',
      request: { query: query, limit: 100 },
      response: {
        results: [{ id: '123', properties: { email: 'example@test.com' } }],
        total: 1,
      },
    }
    fakeHubspotApi.setupServer({ postEndpoints: [searchContactsEndpoint] })

    it("should return contacts and some data associated with those contacts by the contact's email address or name.", function() {
      return hubspot.contacts.search('example').then(data => {
        expect(data.contacts).to.be.a('array')
        expect(data.query).to.equal('example')
        expect(data.contacts[0].vid).to.equal(123)
      })
    })
  })
})

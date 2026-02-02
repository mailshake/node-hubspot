const { expect } = require('chai')
const Hubspot = require('..')
const fakeHubspotApi = require('./helpers/fake_hubspot_api')
const { createTestContact, deleteTestContact } = require('./helpers/factories')

describe('lists', function() {
  const hubspot = new Hubspot({
    accessToken: process.env.ACCESS_TOKEN || 'some-fake-token',
  })
  const listProperties = { name: 'Test list name' }
  const createTestList = () => hubspot.lists.create(listProperties)
  const deleteTestList = listId => hubspot.lists.delete(listId)

  describe('get', function() {
    // v3: POST /crm/v3/lists/search
    const listsEndpoint = {
      path: '/crm/v3/lists/search',
      request: { listIds: [], offset: 0, count: 20 },
      response: {
        results: [{ listId: '123', name: 'Test List', size: 10 }],
      },
    }
    fakeHubspotApi.setupServer({ postEndpoints: [listsEndpoint] })

    it('should return contact lists', function() {
      return hubspot.lists.get().then(data => {
        expect(data).to.be.a('object')
        expect(data.lists).to.be.a('array')
        // Verify v1 format
        expect(data.lists[0].listId).to.equal(123)
        expect(data.lists[0].name).to.equal('Test List')
      })
    })
  })

  describe('getOne', function() {
    describe('when passed a listId', function() {
      let listId = 123
      // v3: GET /crm/v3/lists/{listId}
      const listEndpoint = {
        path: `/crm/v3/lists/${listId}`,
        response: {
          listId: String(listId),
          name: listProperties.name,
          size: 5,
        },
      }
      fakeHubspotApi.setupServer({ getEndpoints: [listEndpoint] })

      before(function() {
        if (process.env.NOCK_OFF) {
          return createTestList(listProperties).then(
            data => (listId = data.listId)
          )
        }
      })
      after(function() {
        if (process.env.NOCK_OFF) {
          return deleteTestList(listId)
        }
      })

      it('should return one contact list', function() {
        return hubspot.lists.getOne(listId).then(data => {
          expect(data).to.be.a('object')
          expect(data.name).to.equal(listProperties.name)
          expect(data.listId).to.equal(123)
        })
      })
    })

    describe('when not passed a listId', function() {
      it('should return a rejected promise', function() {
        return hubspot.lists
          .getOne()
          .then(data => {
            throw new Error('I should have thrown an error')
          })
          .catch(error => {
            expect(error.message).to.equal('id parameter must be provided.')
          })
      })
    })
  })

  describe('create', function() {
    let listId
    // v3: POST /crm/v3/lists
    const createListEndpoint = {
      path: '/crm/v3/lists',
      request: {
        objectTypeId: '0-1',
        processingType: 'MANUAL',
        name: listProperties.name,
      },
      response: { listId: '456', name: listProperties.name, size: 0 },
    }
    fakeHubspotApi.setupServer({ postEndpoints: [createListEndpoint] })

    after(function() {
      if (process.env.NOCK_OFF) {
        return deleteTestList(listId)
      }
    })

    it('should return the created list', function() {
      return hubspot.lists.create(listProperties).then(data => {
        listId = data.listId
        expect(data).to.be.a('object')
        expect(data.listId).to.equal(456)
      })
    })
  })

  describe('delete', function() {
    let listId = 123
    // v3: DELETE /crm/v3/lists/{listId}
    const deleteListEndpoint = {
      path: `/crm/v3/lists/${listId}`,
      statusCode: 204,
    }
    fakeHubspotApi.setupServer({ deleteEndpoints: [deleteListEndpoint] })

    before(function() {
      if (process.env.NOCK_OFF) {
        return createTestList(listProperties).then(
          data => (listId = data.listId)
        )
      }
    })

    it('should return a 204', function() {
      return hubspot.lists.delete(listId).then(data => {
        expect(data).to.be.an('undefined')
      })
    })
  })

  describe('getContacts', function() {
    describe('when passed a listId', function() {
      let listId = 123
      // v3: GET /crm/v3/lists/{listId}/memberships
      const listContactsEndpoint = {
        path: `/crm/v3/lists/${listId}/memberships`,
        response: {
          results: [
            { recordId: '100', membershipTimestamp: '2024-01-01T00:00:00Z' },
            { recordId: '101', membershipTimestamp: '2024-01-02T00:00:00Z' },
          ],
        },
      }
      fakeHubspotApi.setupServer({ getEndpoints: [listContactsEndpoint] })

      before(function() {
        if (process.env.NOCK_OFF) {
          return createTestList(listProperties).then(
            data => (listId = data.listId)
          )
        }
      })
      after(function() {
        if (process.env.NOCK_OFF) {
          return deleteTestList(listId)
        }
      })

      it('should return contacts', function() {
        return hubspot.lists.getContacts(listId).then(data => {
          expect(data).to.be.a('object')
          expect(data.contacts).to.be.an('array')
          expect(data.contacts[0].vid).to.equal(100)
        })
      })
    })

    describe('when not passed a listId', function() {
      it('should return a rejected promise', function() {
        return hubspot.lists
          .getContacts()
          .then(data => {
            throw new Error('I should have thrown an error')
          })
          .catch(error => {
            expect(error.message).to.equal('id parameter must be provided.')
          })
      })
    })
  })

  describe('getRecentContacts', function() {
    describe('when passed a listId', function() {
      let listId = 123
      // v3: GET /crm/v3/lists/{listId}/memberships/join-order
      const listContactsEndpoint = {
        path: `/crm/v3/lists/${listId}/memberships/join-order`,
        response: {
          results: [
            { recordId: '200', membershipTimestamp: '2024-01-05T00:00:00Z' },
          ],
        },
      }
      fakeHubspotApi.setupServer({ getEndpoints: [listContactsEndpoint] })

      before(function() {
        if (process.env.NOCK_OFF) {
          return createTestList(listProperties).then(
            data => (listId = data.listId)
          )
        }
      })
      after(function() {
        if (process.env.NOCK_OFF) {
          return deleteTestList(listId)
        }
      })

      it('should return contacts', function() {
        return hubspot.lists.getRecentContacts(listId).then(data => {
          expect(data).to.be.a('object')
          expect(data.contacts).to.be.an('array')
          expect(data.contacts[0].vid).to.equal(200)
        })
      })
    })

    describe('when not passed a listId', function() {
      it('should return a rejected promise', function() {
        return hubspot.lists
          .getRecentContacts()
          .then(data => {
            throw new Error('I should have thrown an error')
          })
          .catch(error => {
            expect(error.message).to.equal('id parameter must be provided.')
          })
      })
    })
  })

  describe('addContacts', function() {
    describe('when a id and contactBody is provided', function() {
      let listId = 123
      let contactId = 234
      // v3: PUT /crm/v3/lists/{listId}/memberships/add
      const addContactToListEndpoint = {
        path: `/crm/v3/lists/${listId}/memberships/add`,
        request: [contactId],
        response: {},
      }
      fakeHubspotApi.setupServer({ putEndpoints: [addContactToListEndpoint] })

      before(function() {
        if (process.env.NOCK_OFF) {
          return Promise.all([
            createTestContact(hubspot).then(data => (contactId = data.vid)),
            createTestList(listProperties).then(data => (listId = data.listId)),
          ])
        }
      })
      after(function() {
        if (process.env.NOCK_OFF) {
          return Promise.all([
            deleteTestContact(hubspot, contactId),
            deleteTestList(listId),
          ])
        }
      })

      it('should return results', function() {
        return hubspot.lists
          .addContacts(listId, { vids: [contactId] })
          .then(data => {
            expect(data).to.be.a('object')
          })
      })
    })

    describe('when not passed a listId', function() {
      it('should return a rejected promise', function() {
        return hubspot.lists
          .addContacts()
          .then(data => {
            throw new Error('I should have thrown an error')
          })
          .catch(error => {
            expect(error.message).to.equal('id parameter must be provided.')
          })
      })
    })

    describe('when passed a listId but not contactBody', function() {
      it('should return a rejected promise', function() {
        return hubspot.lists
          .addContacts(123)
          .then(data => {
            throw new Error('I should have thrown an error')
          })
          .catch(error => {
            expect(error.message).to.equal(
              'contactBody parameter must be provided.'
            )
          })
      })
    })
  })
})

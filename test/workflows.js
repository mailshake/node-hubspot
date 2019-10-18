const chai = require('chai')
const expect = chai.expect

const Hubspot = require('..')
const hubspot = new Hubspot({ apiKey: process.env.HUBSPOT_API_KEY || 'demo' })

describe('workflows', () => {
  const workflowId = process.env.TEST_WORKFLOW_ID || 2641273
  let contactId
  let contactEmail

  before(() => {
    return hubspot.contacts.get().then((data) => {
      const firstContact = data.contacts[0]
      contactId = firstContact.vid
      contactEmail = firstContact['identity-profiles'][0].identities.find(
        (obj) => obj.type === 'EMAIL'
      ).value
    })
  })

  describe('get', () => {
    it('Should get all workflows', () => {
      return hubspot.workflows.getAll().then((data) => {
        expect(data.workflows).to.be.a('array')
      })
    })

    it('Should get a specific workflow', () => {
      return hubspot.workflows.get(workflowId).then((data) => {
        expect(data).to.be.a('object')
      })
    })
  })

  describe.skip('create', () => {})

  describe.skip('delete', () => {})

  describe('enroll', () => {
    it('Enrolls a contact into a workflow', () => {
      return hubspot.workflows.enroll(workflowId, contactEmail).then((data) => {
        expect(true).to.equal(true)
      })
    })

    it('Unenrolls a contact into a workflow', () => {
      return hubspot.workflows
        .unenroll(workflowId, contactEmail)
        .then((data) => {
          expect(true).to.equal(true)
        })
    })
  })

  describe('current', () => {
    it('Gets the workflows of a contact', () => {
      return hubspot.workflows.current(contactId).then((data) => {
        expect(data).to.be.an('array')
      })
    })
  })

  describe.skip('events', () => {})
})

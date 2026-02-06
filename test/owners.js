const { expect } = require('chai')
const fakeHubspotApi = require('./helpers/fake_hubspot_api')
const Hubspot = require('..')

describe('Owners', function() {
  const ownersGetEndpoint = {
    path: '/crm/v3/owners',
    response: {
      results: [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Doe' },
      ],
    },
  }

  fakeHubspotApi.setupServer({ demo: true, getEndpoints: [ownersGetEndpoint] })

  describe('get', function() {
    it('Should return all owners', function() {
      const hubspot = new Hubspot({ apiKey: 'demo' })

      return hubspot.owners.get().then(data => {
        expect(data).to.be.a('array')
      })
    })
  })
})

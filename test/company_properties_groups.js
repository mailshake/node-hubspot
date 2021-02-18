const chai = require('chai')
const expect = chai.expect

const Hubspot = require('..')
const fakeHubspotApi = require('./helpers/fake_hubspot_api')
const hubspot = new Hubspot({ apiKey: process.env.HUBSPOT_API_KEY || 'demo' })

const group = {
  displayName: 'GROUP DIPLAY NAME',
  name: 'mk_group_fit_segment',
}

describe('companies.properties.groups', () => {
  describe('get', () => {
    it('should return the list of properties groups for companies', () => {
      return hubspot.companies.properties.groups.get().then((data) => {
        // console.log(data)
        expect(data).to.be.an('array')
        expect(data[0]).to.be.an('object')
        expect(data[0]).to.have.a.property('name')
      })
    })
  })

  describe('getAll', () => {
    it('should return the same thing as get', () => {
      return hubspot.companies.properties.groups.get().then((data) => {
        // console.log(data)
        expect(data).to.be.an('array')
        expect(data[0]).to.be.an('object')
        expect(data[0]).to.have.a.property('name')
      })
    })
  })

  describe('upsert call create endpoint first ', () => {
    const companiesEndpoint = {
      path: '/properties/v1/companies/groups',
      request: group,
      response: { success: true },
    }

    fakeHubspotApi.setupServer({
      postEndpoints: [companiesEndpoint],
      demo: true,
    })

    if (process.env.NOCK_OFF) {
      it('will not run with NOCK_OFF set to true. See commit message.')
    } else {
      it('should create or update the properties group', () => {
        return hubspot.companies.properties.groups.upsert(group).then((data) => {
          expect(data).to.be.an('object')
          expect(data.success).to.be.eq(true)
        })
      })
    }
  })

  describe('upsert call update endpoint if property exists ', () => {
    const tryCreateEndpoint = {
      path: '/properties/v1/companies/groups',
      request: group,
      response: 'property exists',
      statusCode: 409,
    }

    const propertiesEndpoint = {
      path: `/properties/v1/companies/groups/named/${group.name}`,
      request: group,
      response: { success: true },
    }

    fakeHubspotApi.setupServer({
      postEndpoints: [tryCreateEndpoint],
      putEndpoints: [propertiesEndpoint],
      demo: true,
    })

    if (process.env.NOCK_OFF) {
      it('will not run with NOCK_OFF set to true. See commit message.')
    } else {
      it('should create or update the properties group exist', () => {
        return hubspot.companies.properties.groups.upsert(group).then((data) => {
          expect(data).to.be.an('object')
          expect(data.success).to.be.eq(true)
        })
      })
    }
  })

  describe('update', () => {
    const propertiesEndpoint = {
      path: `/properties/v1/companies/groups/named/${group.name}`,
      request: group,
      response: { success: true },
    }

    fakeHubspotApi.setupServer({
      putEndpoints: [propertiesEndpoint],
      demo: true,
    })

    if (process.env.NOCK_OFF) {
      it('will not run with NOCK_OFF set to true. See commit message.')
    } else {
      it('should update the property', () => {
        return hubspot.companies.properties.groups.update(group.name, group).then((data) => {
          expect(data).to.be.an('object')
          expect(data.success).to.be.equal(true)
        })
      })
    }
  })
})

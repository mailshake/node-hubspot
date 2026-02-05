const { expect } = require('chai')
const {
  convertListToV1,
  convertListsToV1,
  convertListMembershipsToV1,
  convertListCreateToV3,
  convertAddContactsToV3,
} = require('../lib/v3_compat')

/**
 * These tests verify the v3 -> v1 translation layer for the Contact Lists API
 * produces output matching the field access patterns in mailshake-contacts.
 *
 * Only the Lists API is being sunset (April 30, 2026).
 * See: https://developers.hubspot.com/changelog/extension-contact-lists-api-v1-sunset-moved-to-april-30-2026
 *
 * Reference: mailshake-contacts/lib/services/internal/hubspot/conversions.ts
 * Reference: mailshake-contacts/lib/services/internal/hubspot/index.ts
 */

describe('v3_compat (Lists API)', function() {
  describe('convertListToV1', function() {
    it('should produce listId as integer (conversions.ts:77)', function() {
      const v3List = { listId: '789', name: 'My List', size: 42 }
      const result = convertListToV1(v3List)
      expect(result.listId).to.equal(789)
      expect(result.listId).to.be.a('number')
    })

    it('should produce name (conversions.ts:78)', function() {
      const v3List = { listId: '1', name: 'Test List', size: 0 }
      const result = convertListToV1(v3List)
      expect(result.name).to.equal('Test List')
    })

    it('should produce metaData.size (conversions.ts:79)', function() {
      const v3List = { listId: '1', name: 'List', size: 42 }
      const result = convertListToV1(v3List)
      expect(result.metaData).to.be.an('object')
      expect(result.metaData.size).to.equal(42)
    })

    it('should handle null input', function() {
      expect(convertListToV1(null)).to.be.null
    })
  })

  describe('convertListsToV1', function() {
    it('should produce lists array with pagination (index.ts:786,791,793)', function() {
      const v3Response = {
        results: [
          { listId: '1', name: 'List A', size: 10 },
          { listId: '2', name: 'List B', size: 20 },
        ],
        paging: { next: { after: '50' } },
      }
      const result = convertListsToV1(v3Response)
      expect(result.lists).to.be.an('array')
      expect(result.lists).to.have.lengthOf(2)
      expect(result['has-more']).to.equal(true)
      expect(result.offset).to.equal(50)

      // Simulate index.ts:791,793
      const moreItems = result.hasMore || result['has-more']
      expect(moreItems).to.equal(true)
    })

    it('should set pagination to false/null when no more results', function() {
      const v3Response = {
        results: [{ listId: '1', name: 'Only List', size: 5 }],
      }
      const result = convertListsToV1(v3Response)
      expect(result['has-more']).to.equal(false)
      expect(result.offset).to.be.null
    })

    it('should pass through if already in v1 format', function() {
      const v1Response = { lists: [{ listId: 1, name: 'Already V1' }] }
      const result = convertListsToV1(v1Response)
      expect(result).to.deep.equal(v1Response)
    })
  })

  describe('convertListMembershipsToV1', function() {
    it('should produce contacts with vid and addedAt', function() {
      const v3Response = {
        results: [
          { recordId: '100', membershipTimestamp: '2024-01-01T00:00:00Z' },
          { recordId: '200', membershipTimestamp: '2024-06-15T12:00:00Z' },
        ],
      }
      const result = convertListMembershipsToV1(v3Response)
      expect(result.contacts).to.be.an('array')
      expect(result.contacts).to.have.lengthOf(2)
      expect(result.contacts[0].vid).to.equal(100)
      expect(result.contacts[0].vid).to.be.a('number')
      expect(result.contacts[0].addedAt).to.be.a('number')
    })

    it('should produce has-more and vid-offset for pagination', function() {
      const v3Response = {
        results: [{ recordId: '100', membershipTimestamp: '2024-01-01T00:00:00Z' }],
        paging: { next: { after: '300' } },
      }
      const result = convertListMembershipsToV1(v3Response)
      expect(result['has-more']).to.equal(true)
      expect(result['vid-offset']).to.equal(300)
    })

    it('should handle empty results', function() {
      const v3Response = { results: [] }
      const result = convertListMembershipsToV1(v3Response)
      expect(result.contacts).to.deep.equal([])
      expect(result['has-more']).to.equal(false)
    })
  })

  describe('convertListCreateToV3', function() {
    it('should add objectTypeId and processingType', function() {
      const result = convertListCreateToV3({ name: 'My List' })
      expect(result.objectTypeId).to.equal('0-1')
      expect(result.processingType).to.equal('MANUAL')
      expect(result.name).to.equal('My List')
    })

    it('should allow overriding processingType', function() {
      const result = convertListCreateToV3({
        name: 'Dynamic List',
        processingType: 'DYNAMIC',
      })
      expect(result.processingType).to.equal('DYNAMIC')
    })
  })

  describe('convertAddContactsToV3', function() {
    it('should extract vids from v1 format', function() {
      const result = convertAddContactsToV3({ vids: [123, 456] })
      expect(result).to.deep.equal([123, 456])
    })

    it('should pass through if already an array', function() {
      const result = convertAddContactsToV3([123, 456])
      expect(result).to.deep.equal([123, 456])
    })

    it('should extract emails from v1 format', function() {
      const result = convertAddContactsToV3({ emails: ['a@b.com'] })
      expect(result).to.deep.equal(['a@b.com'])
    })
  })
})

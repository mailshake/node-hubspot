/**
 * v3 Compatibility Layer
 *
 * Translation functions for the Contact Lists API v1 -> v3 migration.
 * Only the Lists API is being sunset (April 30, 2026).
 * See: https://developers.hubspot.com/changelog/extension-contact-lists-api-v1-sunset-moved-to-april-30-2026
 */

/**
 * Convert v3 list response to v1 format
 * v3: { listId: '123', name: 'My List', ... }
 * v1: { listId: 123, name: 'My List', metaData: { size: n }, ... }
 */
function convertListToV1(list) {
  if (!list) {
    return list
  }

  return {
    listId: parseInt(list.listId, 10),
    name: list.name,
    metaData: {
      size: list.size || list.memberCount || 0,
      processing: list.processingType || 'MANUAL',
    },
    // Preserve other fields
    ...Object.fromEntries(
      Object.entries(list).filter(
        ([k]) => !['listId', 'name', 'size'].includes(k)
      )
    ),
  }
}

/**
 * Convert v3 lists response to v1 format
 * v3: { results: [...], paging: {...} }
 * v1: { lists: [...], has-more: true, offset: 123 }
 */
function convertListsToV1(response) {
  if (!response) {
    return response
  }

  // Handle case where response is already in v1 format
  if (response.lists) {
    return response
  }

  const lists = (response.results || []).map(convertListToV1)
  const hasMore = !!(response.paging && response.paging.next)
  const offset = hasMore ? parseInt(response.paging.next.after, 10) : null

  return {
    lists: lists,
    'has-more': hasMore,
    offset: offset,
  }
}

/**
 * Convert v3 list memberships response to v1 contacts format
 * v3: { results: [{ recordId: '123', membershipTimestamp: '...' }] }
 * v1: { contacts: [...], has-more: true, vid-offset: 123 }
 */
function convertListMembershipsToV1(response) {
  if (!response) {
    return response
  }

  const contacts = (response.results || []).map(membership => ({
    vid: parseInt(membership.recordId, 10),
    addedAt: membership.membershipTimestamp
      ? new Date(membership.membershipTimestamp).getTime()
      : null,
  }))

  const hasMore = !!(response.paging && response.paging.next)
  const vidOffset = hasMore ? parseInt(response.paging.next.after, 10) : null

  return {
    contacts: contacts,
    'has-more': hasMore,
    'vid-offset': vidOffset,
  }
}

/**
 * Convert v1-style list create body to v3 format
 * v1: { name: 'My List' }
 * v3: { name: 'My List', objectTypeId: '0-1', processingType: 'MANUAL' }
 */
function convertListCreateToV3(data) {
  return {
    objectTypeId: '0-1', // contacts
    processingType: data.processingType || 'MANUAL',
    name: data.name,
    ...data,
  }
}

/**
 * Convert v1-style add contacts body to v3 format
 * v1: { vids: [123, 234] }
 * v3: [123, 234]
 */
function convertAddContactsToV3(data) {
  if (Array.isArray(data)) {
    return data
  }
  return data.vids || data.emails || []
}

module.exports = {
  convertListToV1,
  convertListsToV1,
  convertListMembershipsToV1,
  convertListCreateToV3,
  convertAddContactsToV3,
}

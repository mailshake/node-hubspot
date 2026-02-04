/**
 * v3 Compatibility Layer
 *
 * This module provides translation functions between HubSpot's v1 and v3 API formats.
 * It allows the library to use v3 endpoints internally while maintaining backward
 * compatibility with code expecting v1-style request/response formats.
 */

/**
 * Convert v1-style properties array to v3-style properties object
 * v1: { properties: [{ property: 'email', value: 'x' }] }
 * v3: { properties: { email: 'x' } }
 */
function convertPropertiesToV3(data) {
  if (!data || !data.properties) {
    return data
  }

  // If already in v3 format (object, not array), return as-is
  if (!Array.isArray(data.properties)) {
    return data
  }

  const v3Properties = {}
  for (const prop of data.properties) {
    if (prop.property && prop.value !== undefined) {
      v3Properties[prop.property] = prop.value
    } else if (prop.name && prop.value !== undefined) {
      // Some v1 endpoints use 'name' instead of 'property'
      v3Properties[prop.name] = prop.value
    }
  }

  return {
    ...data,
    properties: v3Properties,
  }
}

/**
 * Convert v3-style properties object to v1-style nested value format
 * v3: { id: '123', properties: { email: 'x' } }
 * v1: { vid: 123, properties: { email: { value: 'x' } } }
 */
function convertContactToV1(contact) {
  if (!contact) {
    return contact
  }

  const v1Properties = {}
  if (contact.properties) {
    for (const [key, value] of Object.entries(contact.properties)) {
      v1Properties[key] = { value: value }
    }
  }

  // Synthesize identity-profiles from email property (v1 format)
  const email =
    contact.properties && contact.properties.email
      ? contact.properties.email
      : null
  const identityProfiles = email
    ? [{ identities: [{ type: 'EMAIL', value: email }] }]
    : []

  // v3 returns createdAt as ISO string, v1 used addedAt as unix ms
  const addedAt = contact.createdAt
    ? new Date(contact.createdAt).getTime()
    : null

  return {
    vid: parseInt(contact.id, 10),
    properties: v1Properties,
    'identity-profiles': identityProfiles,
    addedAt: addedAt,
    // Preserve any other fields
    ...Object.fromEntries(
      Object.entries(contact).filter(
        ([k]) => !['id', 'properties', 'createdAt'].includes(k)
      )
    ),
  }
}

/**
 * Convert v3 contacts list response to v1 format
 * v3: { results: [...], paging: { next: { after: '123' } } }
 * v1: { contacts: [...], has-more: true, vid-offset: 123 }
 */
function convertContactsListToV1(response) {
  if (!response) {
    return response
  }

  const contacts = (response.results || []).map(convertContactToV1)
  const hasMore = !!(response.paging && response.paging.next)
  const vidOffset = hasMore ? parseInt(response.paging.next.after, 10) : null

  return {
    contacts: contacts,
    'has-more': hasMore,
    'vid-offset': vidOffset,
    'time-offset': vidOffset,
  }
}

/**
 * Convert v3 batch read response to v1 format
 * v3: { results: [...] }
 * v1: { '123': {...}, '234': {...} } (keyed by vid)
 */
function convertBatchContactsToV1(response) {
  if (!response || !response.results) {
    return response
  }

  const result = {}
  for (const contact of response.results) {
    const v1Contact = convertContactToV1(contact)
    result[v1Contact.vid] = v1Contact
  }
  return result
}

/**
 * Convert v3 search response to v1 search format
 * v3: { results: [...], paging: {...}, total: 100 }
 * v1: { contacts: [...], has-more: true, offset: 123, total: 100, query: '...' }
 */
function convertSearchToV1(response, query) {
  if (!response) {
    return response
  }

  const contacts = (response.results || []).map(convertContactToV1)
  const hasMore = !!(response.paging && response.paging.next)
  const offset = hasMore ? parseInt(response.paging.next.after, 10) : 0

  return {
    contacts: contacts,
    'has-more': hasMore,
    offset: offset,
    total: response.total || contacts.length,
    query: query,
  }
}

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

  // The memberships endpoint only returns IDs, not full contacts
  // We need to maintain compatibility with the v1 format that returned contact objects
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
  convertPropertiesToV3,
  convertContactToV1,
  convertContactsListToV1,
  convertBatchContactsToV1,
  convertSearchToV1,
  convertListToV1,
  convertListsToV1,
  convertListMembershipsToV1,
  convertListCreateToV3,
  convertAddContactsToV3,
}

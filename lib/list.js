const {
  convertListToV1,
  convertListsToV1,
  convertListMembershipsToV1,
  convertListCreateToV3,
  convertAddContactsToV3,
} = require('./v3_compat')

class List {
  constructor(client) {
    this.client = client
  }

  get(options) {
    // v3: POST /crm/v3/lists/search (no direct GET all lists in v3)
    const body = {
      listIds: [],
      offset: (options && options.offset) || 0,
      count: (options && options.count) || 20,
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/lists/search',
        body: body,
      })
      .then(convertListsToV1)
  }

  getOne(id) {
    if (!id) {
      return Promise.reject(new Error('id parameter must be provided.'))
    }

    // v3: GET /crm/v3/lists/{listId}
    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/lists/' + id,
      })
      .then(convertListToV1)
  }

  create(data) {
    // v3: POST /crm/v3/lists
    // Requires objectTypeId and processingType
    const v3Data = convertListCreateToV3(data)

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/lists',
        body: v3Data,
      })
      .then(convertListToV1)
  }

  delete(listId) {
    // v3: DELETE /crm/v3/lists/{listId}
    return this.client._request({
      method: 'DELETE',
      path: `/crm/v3/lists/${listId}`,
    })
  }

  getContacts(id, options) {
    if (!id) {
      return Promise.reject(new Error('id parameter must be provided.'))
    }

    // v3 requires two calls: get memberships, then fetch full contacts
    // Step 1: Get membership IDs from the list
    const qs = {}
    if (options) {
      if (options.count) qs.limit = options.count
      if (options.vidOffset) qs.after = options.vidOffset
    }

    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/lists/' + id + '/memberships',
        qs: qs,
      })
      .then(membershipsResponse => {
        const memberships = membershipsResponse.results || []
        if (memberships.length === 0) {
          return convertListMembershipsToV1(membershipsResponse)
        }

        // Step 2: Fetch full contact records by ID
        const contactIds = memberships.map(m => ({ id: m.recordId }))

        // Build properties list from options if provided
        const properties =
          options && options.property
            ? Array.isArray(options.property)
              ? options.property
              : [options.property]
            : ['email', 'firstname', 'lastname']

        return this.client
          ._request({
            method: 'POST',
            path: '/crm/v3/objects/contacts/batch/read',
            body: {
              inputs: contactIds,
              properties: properties,
            },
          })
          .then(contactsResponse => {
            // Merge membership timestamps with contact data
            const contactsById = {}
            for (const contact of contactsResponse.results || []) {
              contactsById[contact.id] = contact
            }

            // Build v1-style response with full contact data
            const contacts = memberships.map(membership => {
              const contact = contactsById[membership.recordId] || {}
              const properties = contact.properties || {}

              // Build v1-style properties object
              const v1Properties = {}
              for (const [key, value] of Object.entries(properties)) {
                v1Properties[key] = { value: value }
              }

              // Build identity-profiles from email
              const email = properties.email || null
              const identities = email ? [{ type: 'EMAIL', value: email }] : []

              return {
                vid: parseInt(membership.recordId, 10),
                properties: v1Properties,
                'identity-profiles': [{ identities: identities }],
                addedAt: membership.membershipTimestamp
                  ? new Date(membership.membershipTimestamp).getTime()
                  : null,
              }
            })

            const hasMore = !!(
              membershipsResponse.paging && membershipsResponse.paging.next
            )
            const vidOffset = hasMore
              ? parseInt(membershipsResponse.paging.next.after, 10)
              : null

            return {
              contacts: contacts,
              'has-more': hasMore,
              'vid-offset': vidOffset,
            }
          })
      })
  }

  getRecentContacts(id, options) {
    if (!id) {
      return Promise.reject(new Error('id parameter must be provided.'))
    }

    // v3 requires two calls: get memberships (by join order), then fetch full contacts
    const qs = {}
    if (options) {
      if (options.count) qs.limit = options.count
      if (options.vidOffset) qs.after = options.vidOffset
    }

    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/lists/' + id + '/memberships/join-order',
        qs: qs,
      })
      .then(membershipsResponse => {
        const memberships = membershipsResponse.results || []
        if (memberships.length === 0) {
          return convertListMembershipsToV1(membershipsResponse)
        }

        // Fetch full contact records by ID
        const contactIds = memberships.map(m => ({ id: m.recordId }))

        const properties =
          options && options.property
            ? Array.isArray(options.property)
              ? options.property
              : [options.property]
            : ['email', 'firstname', 'lastname']

        return this.client
          ._request({
            method: 'POST',
            path: '/crm/v3/objects/contacts/batch/read',
            body: {
              inputs: contactIds,
              properties: properties,
            },
          })
          .then(contactsResponse => {
            const contactsById = {}
            for (const contact of contactsResponse.results || []) {
              contactsById[contact.id] = contact
            }

            const contacts = memberships.map(membership => {
              const contact = contactsById[membership.recordId] || {}
              const properties = contact.properties || {}

              const v1Properties = {}
              for (const [key, value] of Object.entries(properties)) {
                v1Properties[key] = { value: value }
              }

              const email = properties.email || null
              const identities = email ? [{ type: 'EMAIL', value: email }] : []

              return {
                vid: parseInt(membership.recordId, 10),
                properties: v1Properties,
                'identity-profiles': [{ identities: identities }],
                addedAt: membership.membershipTimestamp
                  ? new Date(membership.membershipTimestamp).getTime()
                  : null,
              }
            })

            const hasMore = !!(
              membershipsResponse.paging && membershipsResponse.paging.next
            )
            const vidOffset = hasMore
              ? parseInt(membershipsResponse.paging.next.after, 10)
              : null

            return {
              contacts: contacts,
              'has-more': hasMore,
              'vid-offset': vidOffset,
            }
          })
      })
  }

  addContacts(id, contactBody) {
    if (!id) {
      return Promise.reject(new Error('id parameter must be provided.'))
    }
    if (!contactBody) {
      return Promise.reject(
        new Error('contactBody parameter must be provided.')
      )
    }

    // v3: PUT /crm/v3/lists/{listId}/memberships/add
    // v3 expects array of record IDs, not { vids: [...] }
    const recordIds = convertAddContactsToV3(contactBody)

    return this.client._request({
      method: 'PUT',
      path: '/crm/v3/lists/' + id + '/memberships/add',
      body: recordIds,
    })
  }
}

module.exports = List

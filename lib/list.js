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

    // v3: GET /crm/v3/lists/{listId}/memberships
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
      .then(convertListMembershipsToV1)
  }

  getRecentContacts(id, options) {
    if (!id) {
      return Promise.reject(new Error('id parameter must be provided.'))
    }

    // v3: GET /crm/v3/lists/{listId}/memberships/join-order
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
      .then(convertListMembershipsToV1)
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

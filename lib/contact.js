const Property = require('./contact_property')
const {
  convertPropertiesToV3,
  convertContactToV1,
  convertContactsListToV1,
  convertBatchContactsToV1,
  convertSearchToV1,
} = require('./v3_compat')

class Contact {
  constructor(client) {
    this.client = client
    this.properties = new Property(this.client)
  }

  get(options) {
    // v3: GET /crm/v3/objects/contacts
    // Supports: limit, after, properties, propertiesWithHistory, associations, archived
    const qs = {}
    if (options) {
      if (options.count) qs.limit = options.count
      if (options.vidOffset) qs.after = options.vidOffset
      if (options.property) qs.properties = options.property
      if (options.properties) qs.properties = options.properties
    }

    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/objects/contacts',
        qs: qs,
      })
      .then(convertContactsListToV1)
  }

  getAll(options) {
    return this.get(options)
  }

  getRecentlyModified(options) {
    // v3: Use search with sort by lastmodifieddate
    const body = {
      sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
      limit: (options && options.count) || 100,
    }
    if (options && options.vidOffset) {
      body.after = options.vidOffset
    }
    if (options && options.property) {
      body.properties = Array.isArray(options.property)
        ? options.property
        : [options.property]
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: body,
      })
      .then(response => convertContactsListToV1(response))
  }

  getRecentlyCreated(options) {
    // v3: Use search with sort by createdate
    const body = {
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      limit: (options && options.count) || 100,
    }
    if (options && options.vidOffset) {
      body.after = options.vidOffset
    }
    if (options && options.property) {
      body.properties = Array.isArray(options.property)
        ? options.property
        : [options.property]
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: body,
      })
      .then(response => convertContactsListToV1(response))
  }

  getByEmail(email) {
    // v3: GET /crm/v3/objects/contacts/{email}?idProperty=email
    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/objects/contacts/' + encodeURIComponent(email),
        qs: { idProperty: 'email' },
      })
      .then(convertContactToV1)
  }

  getByEmailBatch(emails) {
    // v3: POST /crm/v3/objects/contacts/batch/read
    const body = {
      idProperty: 'email',
      inputs: emails.map(email => ({ id: email })),
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/batch/read',
        body: body,
      })
      .then(convertBatchContactsToV1)
  }

  getById(id) {
    // v3: GET /crm/v3/objects/contacts/{id}
    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/objects/contacts/' + id,
      })
      .then(convertContactToV1)
  }

  getByIdBatch(ids) {
    // v3: POST /crm/v3/objects/contacts/batch/read
    const body = {
      inputs: ids.map(id => ({ id: String(id) })),
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/batch/read',
        body: body,
      })
      .then(convertBatchContactsToV1)
  }

  getByToken(token) {
    // Note: User token lookup may not have a direct v3 equivalent
    // Falling back to v1 endpoint - this may need special handling
    return this.client._request({
      method: 'GET',
      path: '/contacts/v1/contact/utk/' + token + '/profile',
    })
  }

  delete(id) {
    // v3: DELETE /crm/v3/objects/contacts/{id}
    return this.client._request({
      method: 'DELETE',
      path: '/crm/v3/objects/contacts/' + id,
    })
  }

  update(id, data) {
    // v3: PATCH /crm/v3/objects/contacts/{id}
    const v3Data = convertPropertiesToV3(data)

    return this.client
      ._request({
        method: 'PATCH',
        path: '/crm/v3/objects/contacts/' + id,
        body: v3Data,
      })
      .then(response => {
        // v1 update returned undefined on success (204)
        // v3 returns the updated contact, but we maintain v1 behavior
        return undefined
      })
  }

  create(data) {
    // v3: POST /crm/v3/objects/contacts
    const v3Data = convertPropertiesToV3(data)

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts',
        body: v3Data,
      })
      .then(convertContactToV1)
  }

  createOrUpdate(email, data) {
    // v3: Use upsert endpoint or search + create/update
    // POST /crm/v3/objects/contacts with idProperty for upsert behavior
    const v3Data = convertPropertiesToV3(data)

    // Ensure email is in the properties
    if (!v3Data.properties) {
      v3Data.properties = {}
    }
    v3Data.properties.email = email

    // Use batch upsert with single record for createOrUpdate behavior
    const body = {
      inputs: [v3Data],
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/batch/upsert',
        body: body,
      })
      .then(response => {
        if (response && response.results && response.results.length > 0) {
          return convertContactToV1(response.results[0])
        }
        return {}
      })
  }

  // note: response to successful batch update is undefined by design : http://developers.hubspot.com/docs/methods/contacts/batch_create_or_update
  createOrUpdateBatch(data) {
    // v3: POST /crm/v3/objects/contacts/batch/upsert
    const inputs = data.map(item => {
      const v3Item = convertPropertiesToV3(item)
      // v1 used 'vid' for existing contacts, v3 uses 'id'
      if (item.vid) {
        v3Item.id = String(item.vid)
        delete v3Item.vid
      }
      return v3Item
    })

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/batch/upsert',
        body: { inputs: inputs },
      })
      .then(() => {
        // v1 returned undefined on success, maintain that behavior
        return undefined
      })
  }

  search(query, options) {
    // v3: POST /crm/v3/objects/contacts/search
    if (!options) options = {}

    const body = {
      query: query,
      limit: options.count || 100,
    }
    if (options.offset) {
      body.after = options.offset
    }
    if (options.property) {
      body.properties = Array.isArray(options.property)
        ? options.property
        : [options.property]
    }

    return this.client
      ._request({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: body,
      })
      .then(response => convertSearchToV1(response, query))
  }
}

module.exports = Contact

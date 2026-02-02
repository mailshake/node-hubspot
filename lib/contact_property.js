class Properties {
  constructor(client) {
    this.client = client
  }

  getAll(options) {
    // v3: GET /crm/v3/properties/contacts
    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/properties/contacts',
        qs: options,
      })
      .then(response => {
        // v3 returns { results: [...] }, v1 returned array directly
        return response.results || response
      })
  }

  get(options) {
    return this.getAll(options)
  }

  getByName(name) {
    // v3: GET /crm/v3/properties/contacts/{propertyName}
    return this.client._request({
      method: 'GET',
      path: '/crm/v3/properties/contacts/' + name,
    })
  }

  create(data) {
    // v3: POST /crm/v3/properties/contacts
    return this.client._request({
      method: 'POST',
      path: '/crm/v3/properties/contacts',
      body: data,
    })
  }

  update(name, data) {
    // v3: PATCH /crm/v3/properties/contacts/{propertyName}
    return this.client._request({
      method: 'PATCH',
      path: '/crm/v3/properties/contacts/' + name,
      body: data,
    })
  }

  delete(name) {
    // v3: DELETE /crm/v3/properties/contacts/{propertyName}
    return this.client._request({
      method: 'DELETE',
      path: '/crm/v3/properties/contacts/' + name,
    })
  }

  upsert(data) {
    return this.create(data).catch(err => {
      if (err.statusCode === 409) {
        // if 409, the property already exists, update it
        return this.update(data.name, data)
      } else {
        throw err
      }
    })
  }

  getGroups() {
    // v3: GET /crm/v3/properties/contacts/groups
    return this.client
      ._request({
        method: 'GET',
        path: '/crm/v3/properties/contacts/groups',
      })
      .then(response => {
        // v3 returns { results: [...] }, v1 returned array directly
        return response.results || response
      })
  }

  createGroup(data) {
    // v3: POST /crm/v3/properties/contacts/groups
    return this.client._request({
      method: 'POST',
      path: '/crm/v3/properties/contacts/groups',
      body: data,
    })
  }

  updateGroup(name, data) {
    // v3: PATCH /crm/v3/properties/contacts/groups/{groupName}
    return this.client._request({
      method: 'PATCH',
      path: '/crm/v3/properties/contacts/groups/' + name,
      body: data,
    })
  }

  deleteGroup(name) {
    // v3: DELETE /crm/v3/properties/contacts/groups/{groupName}
    return this.client._request({
      method: 'DELETE',
      path: '/crm/v3/properties/contacts/groups/' + name,
    })
  }
}

module.exports = Properties

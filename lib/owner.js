class Owner {
  constructor(client) {
    this.client = client
  }

  async get(options) {
    const params = { ...options }
    const results = []
    let hasMore = true

    while (hasMore) {
      const res = await this.client._request({
        method: 'GET',
        path: '/crm/v3/owners',
        qs: params,
      })

      results.push(...res.results)

      if (res.paging && res.paging.next && res.paging.next.after) {
        params.after = res.paging.next.after
      } else {
        hasMore = false
      }
    }

    return results
  }
}

module.exports = Owner

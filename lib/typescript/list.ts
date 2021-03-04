import { RequestPromise } from 'request-promise'

declare class List {
  get(opts?: {}): RequestPromise

  getOne(id: number): RequestPromise

  getContacts(id: number, opts?: {}): RequestPromise

  getRecentContacts(id: number, opts?: {}): RequestPromise

  addContacts(id: number, contactBody: {}): RequestPromise
}

export { List }

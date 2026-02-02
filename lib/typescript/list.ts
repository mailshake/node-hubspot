import { RequestPromise } from 'request-promise'

declare class List {
  get(opts?: {}): RequestPromise

  getOne(id: number): RequestPromise

  create(data: { name: string; processingType?: string }): RequestPromise

  delete(listId: number): RequestPromise

  getContacts(id: number, opts?: {}): RequestPromise

  getRecentContacts(id: number, opts?: {}): RequestPromise

  addContacts(
    id: number,
    contactBody: { vids?: number[]; emails?: string[] }
  ): RequestPromise
}

export { List }

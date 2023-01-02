import GenericDbModel from './generic-db-model'
import {deprecate} from "util";

export default class Request extends GenericDbModel<Request> {
  public txHash?: string
  public requestStr: string
  public address: string
  public hash: string

  constructor(o: Request) {
    super(o)
    this.txHash = o.txHash
    this.requestStr = o.requestStr
    this.address = o.address
    this.hash = o.hash
  }

  static async get(uuid: string) {
    return this.getWrap<Request>(Request, global.mongo.request.getByUUID, uuid)
  }

  // REFACTOR: Remove references to this and replace with "create" for consistency
  static async add(o: Request) {
    return this.create(o)
  }

  static async create(o: Request) {
    const r = new Request(o)
    await global.mongo.request.create(r)
    return r
  }

  static async complete({ id, txHash }: {id: string, txHash: string}) {
    global.mongo.request.complete(id, txHash)
    return
  }
}

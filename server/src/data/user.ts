import GenericDbModel from './generic-db-model'

export default class User extends GenericDbModel<User> {
  public phone: string
  public ekey: string
  public eseed: string
  public address: string

  constructor(o: User) {
    super(o)
    this.phone = o.phone
    this.ekey = o.ekey
    this.eseed = o.eseed
    this.address = o.address
  }

  static async get(uuid: string) {
    return this.getWrap<User>(User, global.mongo.user.getByUUID, uuid)
  }

  static getByPhone(phone: string) {
    return this.getWrap<User>(User, global.mongo.user.getByPhone, phone)
  }

  static async create(o: User) {
    const u = new User(o)
    global.mongo.user.create(u)
    return u
  }
}

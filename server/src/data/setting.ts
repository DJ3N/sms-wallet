import GenericDbModel from "./generic-db-model";

export default class Preference extends GenericDbModel<Preference> {
  public user: string
  public searchByPhone: string

  constructor(o: Preference) {
    super(o)
    this.user = o.user
    this.searchByPhone = o.searchByPhone
  }

  static async get(uuid: string) {
    return this.getWrap<Preference>(Preference, global.mongo.preference.getByUUID, uuid)
  }

  static async getByUser(user: string) {
    return this.getWrap<Preference>(Preference, global.mongo.preference.getByUser, user)
  }
}

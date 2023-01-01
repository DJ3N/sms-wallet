export const User = ({
  ...global.mongo.user,
  addNew: async ({ uuid, phone, ekey, eseed, address }: UserType) => {
    const u = await global.mongo.user.getByPhone(phone)
    address = address.toLowerCase()
    if (u) {
      return false
    }
    const details = {
      uuid,
      phone,
      ekey,
      eseed,
      address
    }
    return global.mongo.user.create(details)
  },
})

export type UserType = {
  uuid: string,
  phone: string,
  ekey: string,
  eseed: string,
  address: string,
  created?: Date,
  updated?: Date,
}

export default User

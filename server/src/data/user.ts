const { v1: uuidGenerator } = require('uuid')
const config = require('../../config')
const { GenericBuilder } = require('./generic')
const UserPrototype = GenericBuilder('user')
export const User = ({
  ...UserPrototype,
  addNew: async ({ uuid, phone, ekey, eseed, address }: UserType) => {
    uuid = uuid || uuidGenerator()
    const [u] = await UserPrototype.find(['phone', phone])
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
    return UserPrototype.add(uuid, details)
  },
  findByPhone: async ({ phone }: {phone: string}) => {
    const [u] = await UserPrototype.find(['phone', phone])
    return u
  },
  findByAddress: async ({ address }: {address: string}) => {
    const [u] = await UserPrototype.find(['address', address.toLowerCase()])
    return u
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

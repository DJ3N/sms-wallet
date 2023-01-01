const utils = require('../utils')
const stringify = require('json-stable-stringify')
const RequestPrototype = global.mongo.request

export const Request = ({
  ...RequestPrototype,
  add: async ({ request, address }: {request: any, address: string}) => {
    const requestStr = stringify(request)
    const hash = utils.hexView(utils.keccak(requestStr))
    const uuid = global.mongo.request.create({ txHash: '', hash, requestStr, address })
    return { id: uuid, hash }
  },
  complete: async ({ id, txHash }: {id: string, txHash: string}) => {
    return global.mongo.request.complete(id, txHash)
  },
})

export type RequestType = {
  uuid: string,
  txHash?: string,
  requestStr: string,
  address: string,
  hash: string,
}

export default Request

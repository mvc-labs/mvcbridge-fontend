import HttpRequest from '@/utils/request'

const metasvBrige = new HttpRequest(import.meta.env.VITE_METASV_BRIDGE, {
  responseHandel: (response) => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response?.data?.code === 'number') {
        if (response?.data?.code !== 0) {
          reject({
            message: response?.data.msg,
            code: response?.data?.code,
          })
        } else {
          resolve(response.data)
        }
      } else {
        resolve(response.data)
      }
    })
  },
}).request

interface OrderResult {
  orderTxid: string
  success: boolean
  message: string
}

interface OrderWaitResult {
  vaultId: string
  txid: string
  fromAddress: string
  fromAmount: string
}

enum FromOrToChain {
  mvc = 'mvc',
  eth = 'eth',
}

enum FromOrToTokenName {
  usdt = 'usdt',
  usdc = 'usdc',
}

interface GetReceiveAddressType {
  address: string
  chain: string
  tokenName: string
}

export const GetReceiveAddress = (params: {
  fromChain: string
  fromTokenName: string
}): Promise<GetReceiveAddressType> => {
  const { fromChain, fromTokenName } = params
  return metasvBrige.get(
    `/order/${fromChain.toLocaleLowerCase()}/${fromTokenName.toLocaleLowerCase()}/deposit/address`
  )
}

export const registerOrder = (params: {
  fromChain: string
  fromTokenName: string
  txid: string
  amount: string
  fromAddress: string
  toChain: string
  toTokenName: string
  toAddress: string
  signature?: string
}): Promise<{
  code: number
  data: OrderResult
}> => {
  return metasvBrige.post(`/order/register`, params)
}

export const waitOrderList = (params: {
  fromChain: string
  fromTokenName: string
  address: string
}): Promise<{
  code: number
  data: OrderWaitResult[]
}> => {
  const { fromChain, fromTokenName, address } = params
  return metasvBrige.get(
    `/order/${fromChain.toLocaleLowerCase()}/${fromTokenName.toLocaleLowerCase()}/${address}/waiting`
  )
}

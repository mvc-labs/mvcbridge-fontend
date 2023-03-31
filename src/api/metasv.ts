import HttpRequest from '@/utils/request'
//@ts-ignore
import qs from 'qs'
const metasv = new HttpRequest(import.meta.env.VITE_METASV_API, {
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

interface GetFtBalanceRes {
  codeHash: string
  genesis: string
  name: string
  symbol: string
  decimal: number
  sensibleId: string
  utxoCount: number
  confirmed: number
  confirmedString: string
  unconfirmed: number
  unconfirmedString: string
}

export const GetFtBalance = (params: {
  address: string
  codeHash: string
  genesis: string
}): Promise<{
  code: number
  data: GetFtBalanceRes[]
}> => {
  const qsParams = qs.stringify({
    codeHash: params.codeHash,
    genesis: params.genesis,
  })
  return metasv.get(`/contract/ft/address/${params.address}/balance?${qsParams}`)
}

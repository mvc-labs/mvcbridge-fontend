import HttpRequest from '@/utils/request'
import { useUserStore } from '@/store/user'
const MetaIdBase = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/metaid-base`, {
  header: () => {
    const userStore = useUserStore()
    if (userStore.isAuthorized) {
      return {
        accessKey: userStore.user!.token,
        userName: userStore.userName!,
        timestamp: new Date().getTime(),
        metaId: userStore.user!.metaId,
      }
    } else {
      return {}
    }
  },
  responseHandel: (response) => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 0) {
          resolve(response.data)
        } else {
          reject({
            code: response.data.code,
            message: response.data.msg,
          })
        }
      } else {
        resolve(response.data)
      }
    })
  },
}).request

export const GetTx = (
  txId: string
): Promise<{
  code: number
  data: {
    metanetId: string
    parentAddress: string
    parentTxId: string
    parentData: string
    publicKey: string
    txId: string
  }
}> => {
  return MetaIdBase.get(`/v1/meta/${txId}/info`)
}

export const reportTask = (body: {
  id: string
  list: {
    hex: string
    txId: string
  }[]
}): Promise<any> => {
  return MetaIdBase.post(`/v1/meta/upload/task`, body)
}

export const GetTxChainInfo = (
  txId: string
): Promise<{
  code: number
  data: {
    metanetId: string
    txId: string
    chainFlag: string
  }
}> => {
  return MetaIdBase.get(`/v1/meta/${txId}/info/chain`)
}

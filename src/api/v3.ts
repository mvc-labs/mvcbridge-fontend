import HttpRequest from '@/utils/request'
import { ElMessage } from 'element-plus'
import { alertCatchError } from '@/utils/util'
import { useUserStore } from '@/store/user'
// @ts-ignore
const V3 = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/v3`, {
  header: () => {
    const userStore = useUserStore()
    if (userStore.isAuthorized) {
      return {
        token: userStore.user!.token,
        meta_id: userStore.user!.metaId,
        userName: userStore.userName,
      }
    } else {
      return {}
    }
  },
  errorHandel(error: any) {
    if (error?.response?.status === 401) {
      if (error?.response && error?.response?.data && error?.response?.data?.data) {
        ElMessage.error(error.response.data.data)
      } else {
        alertCatchError(error)
      }
      return Promise.reject(error.response.data.data)
    } else if (error?.response && error?.response?.data && error?.response?.data?.data !== '') {
      return Promise.reject({
        code: error.response?.data?.code,
        message: error.response.data.data,
      })
    } else {
      return Promise.reject(error)
    }
  },
}).request

export const GetMeUtxos = (params: {
  address: string
  amount: number
  meta_id: string
  protocol: string
  receive_address: string
}): Promise<GetMeUtxosRes> => {
  return V3.post('/api/me/user/getOperateFee', params)
}

export const GetMyMEBalance = (params: { address: string }): Promise<GetMyMEBalanceRes> => {
  return V3.post('/api/me/user/myMe', params)
}

export const GetProtocolMeInfo = (params: {
  protocol: string
  address: string
}): Promise<GetProtocolMeInfoRes> => {
  return V3.get(`/api/me/protocol/${params.protocol}/info`, {
    params: { address: params.address },
  })
}

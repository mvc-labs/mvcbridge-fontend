import HttpRequest from '@/utils/request'
import { useUserStore } from '@/store/user'
// @ts-ignore
//${import.meta.env.VITE_HOST_API}
//${import.meta.env.VITE_BASEAPI}/showpaycore
const Core = new HttpRequest(`${import.meta.env.VITE_HOST_API}/core`, {
  header: () => {
    const userStore = useUserStore()
    if (userStore.isAuthorized) {
      return {
        accessKey: userStore.user!.token,
        userName:
          userStore.user!.userType === 'email' || userStore.user?.registerType == 'email'
            ? userStore.user!.email!
            : userStore.user!.phone!,
        timestamp: () => new Date().getTime(),
      }
    } else {
      return {}
    }
  },
  responseHandel: (response) => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 0 || response.data.code === 601) {
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

export const LoginByEthAddress = (params: {
  evmAddress: string
  chainId: string
}): Promise<{
  code: number
  data: {
    evmEnMnemonic: string
    metaId: string
    path: number
    registerSource: string
    registerTime: number
  }
}> => {
  return Core.post(`/api/v1/evm/wallet/mnemonic/check`, params)
}

export const GetMetaIdByLoginName = (params: {
  userType: 'phone' | 'emial'
  phone?: string
  email?: string
  evmAddress?: string
  chainId?: string
}): Promise<{ code: number; result: { metaId: string; path: number; enMnemonic: string } }> => {
  return Core.post(`/api/v1/evm/wallet/user/info`, params)
}

export const GetRandomWord = (): Promise<{ code: number; data: { word: string } }> => {
  return Core.get(`/api/v1/mnemonic/getWord`)
}

export const GetWordBeforeReg = (params: { evmAddress: string; chainId: string }) => {
  return Core.post(`/api/v1/evm/wallet/word/verify`, params)
}

export const LoginByNewUser = (params: {
  word: string
  address: string
  xpub: string
  pubKey: string
  evmEnMnemonic: string
  evmAddress: string
  chainId: string
  userName: string
  path: number | string
}) => {
  return Core.post(`/api/v1/evm/wallet/mnemonic/info/add`, params)
}

export const MnemoicLogin = (params: {
  xpub: string
  sign: string //publickey+word签名
  word: string
  type: number // 1.web 2.app
}): Promise<{
  code: number
  data: BindUserInfo
}> => {
  return Core.post(`/api/v1/mnemonic/verification`, params)
}

export const setHashData = (params: {
  accessKey: string
  userName: string
  timestamp: number
  evmEnMnemonic: string
  chainId: string
  metaId: string
  address: string
}) => {
  return Core.post(
    `/api/v1/evm/wallet/mnemonic/info/bind`,
    {
      evmAddress: params.address,
      evmEnMnemonic: params.evmEnMnemonic,
      metaId: params.metaId,
      chainId: params.chainId,
    },
    {
      headers: {
        accessKey: params.accessKey,
        userName: params.userName,
        timestamp: params.timestamp,
      },
    }
  )
}

export const evmLoginAccountUpdate = (params: {
  accessKey: string
  userName: string
  timestamp: number
  metaId: string
  address: string
  evmAddress: string
  evmEnMnemonic: string
  chainId: string
}): Promise<{
  code: number
  msg: string
}> => {
  return Core.post(
    `/api/v1/evm/wallet/mnemonic/info/upgrade`,
    {
      metaId: params.metaId,
      address: params.address,
      evmAddress: params.evmAddress,
      evmEnMnemonic: params.evmEnMnemonic,
      chainId: params.chainId,
    },
    {
      headers: {
        accessKey: params.accessKey,
        userName: params.userName,
        timestamp: params.timestamp,
      },
    }
  )
}

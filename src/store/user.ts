import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { encode, decode } from 'js-base64'
import { SDK } from '@/utils/sdk'
import { SdkPayType } from '@/enum'
import { useRootStore } from './root'
import { RouteLocationNormalized, RouteLocationNormalizedLoaded } from 'vue-router'
import axios from 'axios'
import { ElMessageBox } from 'element-plus'

interface UserState {
  user: null | UserInfo
  password: string | null
  isNeedConfirm: {
    me: boolean
    bsv: boolean
  }
  wallet: SDK | null

  sdkPayConfirm: {
    [key in SdkPayType]: {
      value: number
      visible: boolean
    }
  }
  sdkPayment: SdkPayType
}
const userkey = encode('user')
let user: any = null
if (window.localStorage.getItem(userkey)) {
  user = decode(window.localStorage.getItem(userkey)!)
  user = JSON.parse(user)
}
const passwordkey = encode('password')
let password = ''
if (window.localStorage.getItem(passwordkey)) {
  password = decode(window.localStorage.getItem(passwordkey)!)
}
const sdkPayConfirmPaymentKey = 'SDK-PAYMENT'
const sdkPayConfirmHideKey = {
  [SdkPayType.ME]: 'HIDE-ME-CONFIRM',
  [SdkPayType.SPACE]: 'HIDE-SPACE-CONFIRM',
}
const sdkPayConfirmMaxKey = {
  [SdkPayType.ME]: 'MAX-ME',
  [SdkPayType.SPACE]: 'MAX-SPACE',
}
const sdkPayConfirm = {
  [SdkPayType.ME]: {
    value: localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.ME])
      ? parseInt(localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.ME])!)
      : 5,
    visible: localStorage.getItem(sdkPayConfirmHideKey[SdkPayType.ME]) ? false : true,
  },
  [SdkPayType.SPACE]: {
    value: localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.SPACE])
      ? parseInt(localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.SPACE])!)
      : 3000,
    visible: localStorage.getItem(sdkPayConfirmHideKey[SdkPayType.SPACE]) ? false : true,
  },
}

export const useUserStore = defineStore('user', {
  state: () =>
    <UserState>{
      user: user,
      password,
      wallet: null,
      sdkPayConfirm: sdkPayConfirm,
      sdkPayment: localStorage.getItem(sdkPayConfirmPaymentKey) || SdkPayType.ME,
    },
  getters: {
    // isAuthorized: (state) => <boolean>!!(state.user && state.user.token),
    isAuthorized: (state) => <boolean>!!state.user,
    userName: (state) => {
      if (state.user) {
        // @ts-ignore
        return state.user!.userType === 'email' || state.user!.registerType === 'email'
          ? state.user!.email!
          : state.user!.phone!
      } else {
        return undefined
      }
    },
    // token: (state) => {
    //   if (state.user && state.user.token) {
    //     return state.user.token
    //   } else {
    //     return undefined
    //   }
    // },
    showWallet: (state) => <SDK>(state.wallet ? toRaw(state.wallet) : state.wallet),
  },
  actions: {
    logout(route?: RouteLocationNormalizedLoaded) {
      return new Promise<void>((resolve) => {
        const rootStore = useRootStore()

        // 只保存pwaInstall状态

        localStorage.clear()
        if (rootStore.updatePlanRes) rootStore.updateAccountPlan(null)
        if (rootStore.isShowLogin) rootStore.$patch({ isShowLogin: false })
        // localStorage.removeItem(encode('user'))
        // localStorage.removeItem(encode('password'))
        // localStorage.removeItem('walletconnect')
        try {
          rootStore.updateShowLoginBindEvmAccount({
            isUpdatePlan: false,
            loginedButBind: false,
            bindEvmChain: '',
          })
          this.user = null
          this.password = null
        } catch {}

        resolve()
      })
    },
    updateUserInfo(userInfo: SetUserInfo) {
      return new Promise<void>(async (resolve) => {
        console.log('userInfo', userInfo)

        const { ...data } = userInfo

        //
        // @ts-ignore
        if (!data.address && data?.rootAddress) {
          // @ts-ignore
          data.address = data?.rootAddress
        }
        // @ts-ignore
        if (!data.userType && data.registerType) {
          // @ts-ignore
          data.userType = data.registerType
        }
        if (!data?.path) {
          data.path = import.meta.env.VITE_WALLET_PATH
        }
        // localStorage.setItem('user', JSON.stringify(data))
        // window.localStorage.setItem('password', password)

        localStorage.setItem(encode('user'), encode(JSON.stringify(data)))

        if (userInfo.password) {
          window.localStorage.setItem(encode('password'), encode(userInfo.password))
        }

        try {
          this.user = data
          console.log('this.uesr', this.user)
        } catch {}

        resolve()
      })
    },
    checkUserToken(route: RouteLocationNormalized) {
      return new Promise<void>(async (resolve, reject) => {
        const res = await axios
          .get(
            `${import.meta.env.VITE_BASEAPI}/showpaycore/api/v1/user/checkUserToken?user_ctoken=${
              this.user!.token
            }`
          )
          .catch(() => resolve())
        if (res?.data && res?.data?.code === 0) {
          resolve()
        } else {
          this.logout(route)
          const rootStore = useRootStore()
          ElMessageBox.alert('Login information expired, please log in again', 'Kind tips', {
            confirmButtonText: 'to log in',
          }).then(() => {
            rootStore.$patch({ isShowLogin: true })
          })
          reject(new Error('Login information expired'))
        }
      })
    },
    changeSdkPayConfirm(type: 'visible' | 'value', value: number | boolean, payType: SdkPayType) {
      if (type === 'visible') {
        if (value) {
          localStorage.removeItem(sdkPayConfirmHideKey[payType])
        } else {
          localStorage.setItem(sdkPayConfirmHideKey[payType], true.toString())
        }
        this.sdkPayConfirm[payType].visible = value as boolean
      } else {
        localStorage.setItem(sdkPayConfirmMaxKey[payType], value.toString())
        this.sdkPayConfirm[payType].value = value as number
      }
    },
    changeSdkPayment(payType: SdkPayType) {
      if (payType === this.sdkPayment) return
      localStorage.setItem(sdkPayConfirmPaymentKey, payType)
      this.sdkPayment = payType
    },
  },
})

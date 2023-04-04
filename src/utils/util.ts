import { ElLoading, LoadingParentElement, ElMessage } from 'element-plus'
import { decode, encode } from 'js-base64'
import { useUserStore } from '@/store/user'
import { useRootStore } from '@/store/root'
import { MappingIcon, CoinSymbol, ChainOrigin, MappingChainName } from '@/enum'
import { eth, bsc, polygon, sepolias } from '@/assets/contract/contract.json'
import { ETH, BSC, POLYGON, SEPOLIA } from '@/assets/contract/abi.json'
import Decimal from 'decimal.js-light'
import { email } from './reg'
import { GetMetaNameInfo, GetMetaIdByAddress, GetUserAllInfo } from '@/api/aggregation'
import i18n from './i18n'
import dayjs from 'dayjs'
import { resolveAddress, isAddress } from 'ethers'
import { OrderApi, OrderRegisterRequest } from 'mvcbridge-sdk/api'
import { SignatureHelper } from 'mvcbridge-sdk/signature'
export function diffTime() {
  const lastTime = window.localStorage.getItem('lastedGetRateTime')
  if (!lastTime) {
    return true
  } else {
    const res = dayjs(Date.now()).diff(dayjs(+lastTime!), 'minutes')
    console.log('res', res)
    return res >= 30
  }
}

export function openLoading(params?: {
  parent?: LoadingParentElement
  background?: string
  svg?: string
  svgViewBox?: string
  spinner?: string
  text?: string
  fullscreen?: boolean
  lock?: boolean
  customClass?: string
  visible?: boolean
  target?: HTMLElement
  beforeClose?: () => boolean
  closed?: () => void
}) {
  if (!params) params = {}
  if (!params.background) params.background = 'rgba(122, 122, 122, 0.8)'
  // if (!params.background) params.background = 'rgba(0,0,0,0.3)'
  return ElLoading.service({
    ...params,
    // svgViewBox: '0 0 156.99951171875 125.99756622314453',
    // svg: LoadingTEXT,
    lock: params?.lock || true,
    // svgViewBox: '0 0 20 20',
    // @ts-ignore
    text: params?.text || i18n.global.t('Loading') + '...',
  })
}

export function alertCatchError(error: any) {
  return new Promise<void>((resolve) => {
    if (error) {
      if (typeof error === 'string') {
        ElMessage.error(error)
      } else if (error.message) {
        ElMessage.error({
          message: error.message,
          duration: 50000,
        })
      }
    }
    resolve()
  })
}

export function checkUserLogin() {
  return new Promise<void>((resolve, reject) => {
    const userStore = useUserStore()
    const rootStore = useRootStore()
    if (!userStore.isAuthorized) {
      rootStore.$patch({ isShowLogin: true })
    } else {
      resolve()
    }
  })
}

export function getLocalAccount() {
  const localPassword = window.localStorage.getItem(encode('password'))
  const localUserInfo = window.localStorage.getItem(encode('user'))
  if (!localPassword || !localUserInfo) {
    throw new Error('用户登录失败')
  }
  const password = decode(localPassword)
  const userInfo: UserInfo = JSON.parse(decode(localUserInfo))
  // 如果缓存是老的（没有Path），则删除缓存重新登录
  if (!userInfo.path) {
    window.localStorage.removeItem(encode('password'))
    window.localStorage.removeItem(encode('user'))
    // reload
    window.location.reload()
  }
  return {
    password,
    userInfo,
  }
}

export function sleep(timer = 2000) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, timer)
  })
}

// 是否邮箱
export function isEmail(email = '') {
  const emailReg = new RegExp('^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(.[a-zA-Z0-9_-]+)+$')
  return emailReg.test(email)
}

export function mappingChainName(chainid: string) {
  switch (chainid) {
    case '0x1':
    case '0x5':
    case '0xaa36a7':
      return MappingChainName.Ethereum
    case '0x89':
      return MappingChainName.Matic
    case '0x38':
      return MappingChainName.BNB
  }
}

export function mappingChain(chainid: string) {
  switch (chainid) {
    case '0x1':
    case '0xaa36a7':
      return MappingIcon.ETH
    case '0x89':
      return MappingIcon.POLYGON
    case '0x38':
      return MappingIcon.BSC
  }
}

export function mappingChainOrigin(chainid: string) {
  switch (chainid) {
    case '0x1':
    case '0xaa36a7':
      return ChainOrigin.ETH
    case '0x89':
      return ChainOrigin.POLYGON
    case '0x38':
      return ChainOrigin.BSC
  }
}

export function mappingCoin(chainid: string) {
  switch (chainid) {
    case '0x1':
    case '0xaa36a7':
      return CoinSymbol.ETH
    case '0x89':
      return CoinSymbol.POLYGON
    case '0x38':
      return CoinSymbol.BSC
  }
}

export function chainTokenInfo(chainid: string) {
  const info = {
    eth: {
      usdt: {
        contractAddress: eth.usdt,
        abi: ETH.USDT,
        decimal: 6,
      },
      usdc: {
        contractAddress: eth.usdc,
        abi: ETH.USDC,
        decimal: 18,
      },
    },
    sepolias: {
      usdt: {
        contractAddress: sepolias.usdt,
        abi: SEPOLIA.USDT,
        decimal: 6,
      },
      usdc: {
        contractAddress: sepolias.usdc,
        abi: SEPOLIA.USDC,
        decimal: 6,
      },
    },
    bsc: {
      usdt: {
        contractAddress: bsc.usdt,
        abi: BSC.USDT,
        decimal: 6,
      },
      usdc: {
        contractAddress: bsc.usdc,
        abi: BSC.USDC,
        decimal: 18,
      },
    },
    polygon: {
      usdt: {
        contractAddress: polygon.usdt,
        abi: POLYGON.USDT,
        decimal: 6,
      },
      usdc: {
        contractAddress: polygon.usdc,
        abi: POLYGON.USDC,
        decimal: 18,
      },
    },
  }
  switch (chainid) {
    case '0x1':
      return info.eth
    case '0xaa36a7':
      return info.sepolias
    case '0x89':
      return info.polygon
    case '0x38':
      return info.bsc
  }
}

export function GetSpanceBalance() {
  return new Promise<number>(async (resolve) => {
    const userStore = useUserStore()
    const res = await userStore
      .showWallet!.wallet!.provider.getXpubBalance(
        userStore.showWallet.wallet?.wallet.xpubkey.toString()
      )
      .catch((error) => {
        ElMessage.error(error.message)
        resolve(0)
      })
    if (typeof res === 'number') {
      const balance = new Decimal(new Decimal(res).div(Math.pow(10, 8))).toNumber()
      resolve(balance)
    }
  })
}

export function getAccountUserInfo(account: string) {
  return new Promise<UserAllInfo>(async (resolve, reject) => {
    try {
      let metaId: string = ''
      let address: string = ''
      const userStore = useUserStore()
      if (email.test(account)) {
        const res = await userStore.showWallet.wallet?.provider.getPayMailAddress(account)
        if (res) {
          address = res
        }
      }

      let isAddress: any = false

      try {
        // @ts-ignore
        isAddress = mvc.Address._transformString(account)
        if (isAddress) {
          address = account
        }
      } catch (error) {
        isAddress = false
      }

      if (account.length === 64 && !email.test(account) && !isAddress) {
        // MetaId
        metaId = account
      }

      if (account.length !== 64 && !email.test(account) && !isAddress) {
        const res = await GetMetaNameInfo(account.replace('.metaid', ''))
        if (res.code === 0) {
          if (
            res.data.resolveAddress &&
            res.data.ownerAddress &&
            res.data.ownerAddress === res.data.resolveAddress
          ) {
            address = res.data.resolveAddress
          } else {
            throw new Error(i18n.global.t('NFT.TransferToMetaNameNotMatch'))
          }
        }
      }

      if (address) {
        const res = await GetMetaIdByAddress(address).catch(() => {
          metaId = ''
        })
        if (res?.code === 0) {
          metaId = res.data
        }
      }

      if (metaId === '') {
        resolve({
          metaId: '',
          address: address,
          name: email.test(account) ? account : '',
          avatarImage: '',
        } as UserAllInfo)
      } else {
        const res = await GetUserAllInfo(metaId!).catch((error) => {
          ElMessage.error(error.message)
        })
        if (res?.code === 0) {
          resolve(res.data)
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function ensConvertAddress(ens: string) {
  const rootStore = useRootStore()
  const reg = RegExp(/\.eth/gi)
  return new Promise(async (resolve, reject) => {
    if (!ens) reject()
    try {
      if (ens.match(reg)) {
        const res = await resolveAddress(ens, rootStore.GetWeb3Wallet.provider)
        resolve(res)
      } else if (isAddress(ens)) {
        resolve(ens)
      } else {
        reject(`Target Is Not a ENS OR Address`)
      }
    } catch (error: any) {
      reject(`Target Is Not a ENS OR Address`)
    }
  })
}

export function GeneratorSignatrue(registerRequest: OrderRegisterRequest): OrderRegisterRequest {
  const message = SignatureHelper.getSigningMessageFromOrder(registerRequest)
  const userStore = useUserStore()
  const signature = SignatureHelper.signMessageBitcoin(
    message,
    userStore.showWallet!.wallet!.wallet!.deriveChild(0).deriveChild(0).privateKey.toString()
  )
  registerRequest.signature = signature
  return registerRequest
}
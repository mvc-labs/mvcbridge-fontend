import Decimal from 'decimal.js-light'
import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { formatEther, formatUnits } from 'ethers'
import { GetSpanceBalance } from '@/utils/util'
import { ToCurrency, MvcUsdToken, ChainTypeBalance } from '@/enum'
import { GetFtBalance } from '@/api/metasv'
import { useUserStore } from '@/store/user'
import { OrderApi } from 'mvcbridge-sdk/api'
import { BASE_PATH } from 'mvcbridge-sdk/base'
import { GetReceiveAddress } from '@/api/api'

interface Web3Wallet {
  provider: any
  signer: any
  sign: Function
  contract: any
  usdt: any
  usdc: any
}

interface AccountChainInfo {
  [key: string]: any
  balance: number
}

interface RootState {
  Web3WalletSdk: Web3Wallet | any
  isWalletConnect: boolean
  showLoginBindEvmAccount: {
    isUpdatePlan: boolean
    loginedButBind: boolean
    bindEvmChain: string
  }
  Web3WalletTokenBalance: {
    currency: string
    usdt: string
    usdc: string
  }
  mvcWalletTokenBalance: {
    space: string
    usdt: string
    usdc?: string
  }
  updatePlanRes: {
    registerTime: number
    signHash: string
  } | null
  isShowLogin: boolean
  isShowMetaMak: boolean
  chainWhiteList: Array<string>
  updatePlanWhiteList: string[]
  exchangeRate: ExchangeRate[]
  // isGetedExchangeRate: boolean
  currentPrice: ToCurrency
  orderApi: any
  MvcFtList: Array<{
    tokenName: string
    codeHash: string
    genesis: string
    decimal: number
  }>
  receiverInfo: {
    mvc: Partial<GetReceiveAddressType> | null
    eth: Partial<GetReceiveAddressType> | null
  }
}
const UA = window.navigator.userAgent.toLowerCase()

export const isApp = !!window.appMetaIdJsV2
export const isAndroid = !!(UA && UA.indexOf('android') > 0)
export const isIOS = !!(UA && /iphone|ipad|ipod|ios/.test(UA))
export const isIosApp = isIOS && isApp
export const isAndroidApp = isApp && isAndroid
export const useRootStore = defineStore('root', {
  state: () =>
    <RootState>{
      Web3WalletSdk: {},
      isShowLogin: false,
      isWalletConnect: window.localStorage.getItem('walletConnect') || false,
      showLoginBindEvmAccount: {
        isUpdatePlan: false,
        loginedButBind: false,
        bindEvmChain: '',
      },
      isShowMetaMak: false,
      updatePlanRes: null,
      //@ts-ignore
      exchangeRate: JSON.parse(window.localStorage.getItem('currentRate')) || [],
      // isGetedExchangeRate: false,
      Web3WalletTokenBalance: {
        currency: '0',
        usdt: '0',
        usdc: '0',
      },
      mvcWalletTokenBalance: {
        space: '0',
        usdt: '0',
        usdc: '0',
      },
      chainWhiteList: import.meta.env.MODE == 'gray' ? ['0xaa36a7'] : ['0x1'],
      updatePlanWhiteList: ['0x0c45B536C69AB0B8806a65C94BA8C8e6e71Ba7c'],
      currentPrice: 'USD',
      orderApi: null,
      MvcFtList: [
        {
          tokenName: MvcUsdToken.M_USDT,
          codeHash: 'a2421f1e90c6048c36745edd44fad682e8644693',
          genesis: '94c2ae3fdbf95a4fb0d788c818cf5fcc7a9aa66a',
          decimal: 6,
        },
        // {
        //   tokenName: MvcUsdToken.M_USDC,
        //   codeHash: 'a2421f1e90c6048c36745edd44fad682e8644693',
        //   genesis: '744a02129eefc1f478e6aec5c3ab2e9147f0cf3c',
        //   decimal: 8,
        // },
      ],
      receiverInfo: {
        mvc: {
          // address: 'mnAVPfHyWuQ1JeRDAnXz3WTUJMckYwSTXv',
          // chain: 'mvc',
          // decimal: 6,
          // depositConfirmation: 30,
          // depositMinAmount: 10000000,
          // tokenName: 'usdt',
          // withdrawBridgeFeeRate: '0.005',
          // withdrawGasFee: 0,
        },
        eth: {
          // address: '0x46b984dD9f5B04DD40E0A64Cad4C4D8821aef11c',
          // chain: 'eth',
          // decimal: 6,
          // depositConfirmation: 12,
          // depositMinAmount: 10000000,
          // tokenName: 'usdt',
          // withdrawBridgeFeeRate: '0.005',
          // withdrawGasFee: 5000000,
        },
      },
    },
  getters: {
    GetWeb3Wallet: (state) => {
      return toRaw(state.Web3WalletSdk)
    },
    GetOrderApi: (state) => {
      return toRaw(state.orderApi)
    },
    currentExchangeRate: (state) =>
      state.exchangeRate.find((item) => item.symbol === state.currentPrice),
    ethAndMvcExchangeRate: (state) => {
      return state.exchangeRate.filter((item) => item.symbol == 'mvc' || 'eth')
    },
  },
  actions: {
    async setReceiverAddress() {
      try {
        const ethAddress = await GetReceiveAddress({
          chainName: 'eth',
          tokenName: 'usdt',
        })
        const mvcAddress = await GetReceiveAddress({
          chainName: 'mvc',
          tokenName: 'usdt',
        })
        ethAddress.withdrawBridgeFeeRate == '0.0' ? '0' : ethAddress.withdrawBridgeFeeRate
        mvcAddress.withdrawBridgeFeeRate == '0.0' ? '0' : mvcAddress.withdrawBridgeFeeRate
        this.receiverInfo = { mvc: mvcAddress, eth: ethAddress }
        console.log('this.receiverInfo', this.receiverInfo)
      } catch (error) {
        throw new Error(error)
      }
    },
    InitWeb3Wallet(payload: any) {
      this.Web3WalletSdk = payload
    },
    InitOrderApi() {
      this.orderApi = new OrderApi(undefined, import.meta.env.VITE_MVC_BRIDGEAPI)
    },

    async GetWeb3AccountBalance(payload: ChainTypeBalance = ChainTypeBalance.ALL) {
      const userStore = useUserStore()
      const mvcRequest = []
      if (payload === ChainTypeBalance.ALL) {
        const ethCurrency = this.GetWeb3Wallet.provider.getBalance(
          this.GetWeb3Wallet.signer.address
        )
        const mvcCurrency = GetSpanceBalance()
        const usdt = this.GetWeb3Wallet.contract[0].balanceOf(this.GetWeb3Wallet.signer.address)
        const usdc = this.GetWeb3Wallet.contract[1].balanceOf(this.GetWeb3Wallet.signer.address)

        for (let i of this.MvcFtList) {
          const res = GetFtBalance({
            address: userStore.user!.address,
            codeHash: i.codeHash,
            genesis: i.genesis,
          })
          mvcRequest.push(res)
        }

        const result: any = await Promise.allSettled([
          ethCurrency,
          mvcCurrency,
          usdt,
          usdc,
          ...mvcRequest,
        ])

        this.Web3WalletTokenBalance.currency = new Decimal(formatEther(result[0].value))
          .toNumber()
          .toFixed(4)
        this.mvcWalletTokenBalance.space = Math.abs(result[1].value?.toFixed(8)) || '0'
        this.Web3WalletTokenBalance.usdt = new Decimal(formatUnits(result[2].value, 6))
          .toNumber()
          .toFixed(4)
        this.Web3WalletTokenBalance.usdc = new Decimal(formatUnits(result[3].value, 6))
          .toNumber()
          .toFixed(4)
        this.mvcWalletTokenBalance.usdt =
          Math.abs(
            new Decimal(result[4].value[0]?.confirmedString || '0')
              .add(result[4].value[0]?.unconfirmed || '0')
              .div(10 ** result[4].value[0]?.decimal || 0)
              .toNumber()
          ) || '0'
        // this.mvcWalletTokenBalance.usdc =
        //   Math.abs(
        //     new Decimal(result[5].value[0]?.confirmedString || '0')
        //       .add(result[5].value[0]?.unconfirmed || '0')
        //       .div(10 ** result[5].value[0]?.decimal || 0)
        //       .toNumber()
        //   ) || '0'
      } else if (payload === ChainTypeBalance.ETH) {
        const ethCurrency = this.GetWeb3Wallet.provider.getBalance(
          this.GetWeb3Wallet.signer.address
        )
        const usdt = this.GetWeb3Wallet.contract[0].balanceOf(this.GetWeb3Wallet.signer.address)
        const usdc = this.GetWeb3Wallet.contract[1].balanceOf(this.GetWeb3Wallet.signer.address)
        const result: any = await Promise.allSettled([ethCurrency, usdt, usdc])
        console.log('result', result)
        this.Web3WalletTokenBalance.currency = new Decimal(formatEther(result[0].value))
          .toNumber()
          .toFixed(4)
        this.Web3WalletTokenBalance.usdt = new Decimal(formatUnits(result[1].value, 6))
          .toNumber()
          .toFixed(4)
        this.Web3WalletTokenBalance.usdc = new Decimal(formatUnits(result[2].value, 6))
          .toNumber()
          .toFixed(4)
      } else if (payload == ChainTypeBalance.MVC) {
        const mvcCurrency = GetSpanceBalance()

        for (let i of this.MvcFtList) {
          const res = GetFtBalance({
            address: userStore.user!.address,
            codeHash: i.codeHash,
            genesis: i.genesis,
          })
          mvcRequest.push(res)
        }

        const result: any = await Promise.allSettled([mvcCurrency, ...mvcRequest])

        console.log('result', result)

        this.mvcWalletTokenBalance.space = result[0].value.toFixed(8)

        this.mvcWalletTokenBalance.usdt =
          new Decimal(result[1].value[0]?.confirmedString || 0)
            .add(result[1].value[0]?.unconfirmed || '0')
            .div(10 ** result[1].value[0]?.decimal || 0)
            .toString() || '0'
        // this.mvcWalletTokenBalance.usdc =
        //   new Decimal(result[2].value[0]?.confirmedString || 0)
        //     .add(result[2].value[0]?.unconfirmed || '0')
        //     .div(10 ** result[2].value[0]?.decimal || 0)
        //     .toString() || '0'
      }

      console.log(
        'this.Web3WalletTokenBalance',
        this.Web3WalletTokenBalance,
        this.mvcWalletTokenBalance
      )
    },
    updateShowLoginBindEvmAccount(payload: {
      isUpdatePlan: boolean
      loginedButBind: boolean
      bindEvmChain: string
    }) {
      this.showLoginBindEvmAccount = payload
    },
    updateAccountPlan(payload: { registerTime: number; signHash: string } | null) {
      this.updatePlanRes = payload
    },
    getExchangeRate() {
      // this.isGetedExchangeRate = true
      fetchExchangeRate().then((res: any) => {
        if (res) {
          this.exchangeRate = res
          window.localStorage.setItem('currentRate', JSON.stringify(res))
          window.localStorage.setItem('lastedGetRateTime', String(+Date.now()))
        }
      })
    },
  },
})

function fetchExchangeRate() {
  return new Promise((resolve) => {
    fetch(`${import.meta.env.VITE_HOST_API}/metaid-base/v1/exchange/rates`)
      .then((response) => {
        return response.json()
      })
      .then((res) => {
        if (res?.result) {
          resolve(res.result.rates)
        }
      })
      .catch(() => resolve(null))
  })
}

<template>
  <div class="header-wrap">
    <header class="flex flex-align-center">
      <div class="logo">
        <img :src="Logo" alt="" />
      </div>

      <div class="menu">
        <!-- <div class="wallet" v-if="userStore.isAuthorized" @click="isHome = !isHome">
          <img :src="FaucetIcon" alt="" v-if="isHome" />
          <el-icon :size="15" color="#fff" v-else><HomeFilled /></el-icon>
        </div> -->
        <div class="wallet" v-if="userStore.isAuthorized" @click="getPendingList">
          <img :src="HistoryIcon" alt="" />
        </div>
        <div class="wallet" v-if="userStore.isAuthorized" @click="checkWalletInfo">
          <img :src="WalletIcon" alt="" />
        </div>

        <div v-if="!userStore.user" @click="ConnectWallet" class="login-btn">Connect Wallet</div>
        <div v-else class="logined-meun">
          <el-dropdown @command="handleCommand" trigger="click">
            <div class="el-dropdown-link">
              <img :src="IconMetaMask" alt="" />
              <span>{{ $filters.spiltAddress(userStore?.user?.evmAddress) }}</span>
            </div>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">Sign out</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>
  </div>
  <div class="swap" v-if="isHome">
    <div class="swap-warp">
      <div class="swap-container"><SwapItem></SwapItem></div>
    </div>
  </div>

  <div class="faucet-wrap" v-else>
    <div class="back">
      <el-icon size="40" @click="isHome = true"><Back /></el-icon>
      <span>{{ $t('back') }}</span>
    </div>
    <div class="btn-group">
      <div class="btn-item">
        <el-button @click="toSpaceFaucet">{{ $t('to mvcfaucet') }}</el-button>
        <span>{{ $t('tip4') }}</span>
      </div>
      <div class="btn-item">
        <el-button @click="toSepoliaFauct">{{ $t('to faucet') }}</el-button>
        <span>{{ $t('tip2') }}</span>
      </div>
      <div class="btn-item">
        <el-button :loading="faucetLoading" @click="faucet">{{ $t('MUSDT Faucet') }}</el-button>
        <span>{{ $t('tip3') }}</span>
      </div>
    </div>
  </div>

  <div class="foot">
    <footer class="flex flex-align-center">
      <div class="logo">
        <img :src="Logo" alt="" />
      </div>
      <div class="contract-us">
        <img :src="item.icon" alt="" v-for="item in contractList" @click="toLink(item.url)" />
      </div>
    </footer>
  </div>

  <Drawer v-model:drawer-operate="DrawerOperate" v-model:inner-drawer="innerDrawer">
    <template #header>
      <div class="back">
        <el-icon @click="innerDrawer = false"><ArrowLeftBold color="#fff" /></el-icon>
      </div>
    </template>

    <template #content>
      <div class="assert-list-wrap">
        <div class="assert-list" v-for="item in walletList">
          <div class="header">
            <span class="chain">{{ item.chain }}</span>
            <span
              class="address"
              @click="
                copy(
                  item.chain == ChainOrigin.MVC
                    ? userStore.user!.address!
                    : userStore.user!.evmAddress!
                )
              "
              >{{
                item.chain == ChainOrigin.MVC
                  ? $filters.spiltAddress(userStore.user!.address!)
                  : $filters.spiltAddress(userStore.user!.evmAddress!)
              }}</span
            >
          </div>
          <div class="list" v-for="coin in item.coinList">
            <IconItem :iconMap="coin.chainName"></IconItem>
            <div class="right">
              <div class="item">
                <span class="symbol" v-loading="coin.loading" element-loading-background="#232531"
                  >{{ coin.balance }} {{ coin.chainSymbol }}</span
                >
                <span class="priceRate"
                  >{{ $filters.rateToUsd(coin.balance, coin.chainSymbol) }}&nbsp;USD</span
                >
              </div>
              <el-button :disabled="coin.loading" @click="selectCoinTransfer(coin.chainName)"
                >Transfer</el-button
              >
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #innerContent>
      <div
        class="form-wrap"
        element-loading-text="Transaction sending"
        v-loading.fullscreen.lock="transferLoading"
        element-loading-background="rgba(122, 122, 122, 0.8)"
      >
        <el-form
          :hide-required-asterisk="true"
          ref="ruleFormRef"
          :model="ruleForm"
          :rules="rules"
          label-position="top"
          label-width="120px"
          class="demo-ruleForm"
          :size="formSize"
          status-icon
        >
          <el-form-item label="Transfer Address" prop="address">
            <el-input
              :placeholder="
                MetaNameOrEns ? 'Enter Transfer Address/MetaName' : 'Enter Transfer Address/ENS'
              "
              v-model="ruleForm.address"
            />
          </el-form-item>
          <el-form-item label="Transfer Amount" prop="amount">
            <el-input placeholder="Enter Transfer Amount" v-model="ruleForm.amount">
              <template #append v-if="currentTransferType == MappingIcon.MVC">
                <el-select
                  custom-class="amount-select"
                  v-model="currentCoinUit"
                  placeholder="Select"
                  style="width: 100px"
                >
                  <el-option :label="CoinUint.Sat" :value="CoinUint.Sat" />
                  <el-option :label="CoinUint.Space" :value="CoinUint.Space" />
                </el-select>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button class="transferBtn globalBtn" @click="TransferConfrim(ruleFormRef)"
              >Transfer</el-button
            >
          </el-form-item>
        </el-form>
      </div>
    </template>
  </Drawer>
  <Dialog hasCustomClass="historyDialog" v-model="historyDialog">
    <template #title>
      <div>
        {{ currentTableLayout == OrderType.Pending ? $t('pengdingOrder') : $t('FinalizeOrder') }}
      </div>
    </template>
    <template #content>
      <!-- <div v-if="transationHistoryList.length" class="blankHistoryWrap">
        <span>No transfers yet</span>
      </div> -->
      <div class="table_wrap">
        <div class="tableLayout">
          <div
            @click="getPendingList"
            :class="['item', currentTableLayout == OrderType.Pending ? 'is-active' : '']"
          >
            {{ $t('Pending Request') }}
          </div>
          <div
            @click="getHistoryList"
            :class="['item', currentTableLayout == OrderType.Finalize ? 'is-active' : '']"
          >
            {{ $t('Finalize Request') }}
          </div>
        </div>
        <el-table
          empty-text="No transfers yet"
          v-loading="loadingHistory"
          element-loading-text="Loading..."
          :element-loading-spinner="svg"
          element-loading-svg-view-box="-10, -10, 50, 50"
          element-loading-background="rgba(122, 122, 122, 0.6)"
          header-row-class-name="header-row"
          :data="transationHistoryList"
          :default-sort="{ prop: 'Date', order: 'descending' }"
          height="300"
          style="width: 100%; background-color: var(--themeBgFourColor) !important"
          header-cell-class-name="header-cell"
          :header-cell-style="{
            background: '#232530',
            color: '#fff',
            padding: 0,
            fontSize: '13px',
          }"
          :cell-style="{ background: '#232530', color: '#fff' }"
        >
          <el-table-column class-name="col-item" prop="Currency" label="Token" width="100">
            <template #default="scope">
              <div class="tx-cell">
                <IconItem :iconMap="scope.row.Currency"></IconItem>
              </div>
            </template>
          </el-table-column>
          <el-table-column class-name="col-item" prop="Send" label="Send" width="100">
            <template #default="scope">
              <div class="tx-cell">
                <IconItem :iconMap="scope.row.Send"></IconItem>
              </div>
            </template>
          </el-table-column>
          <el-table-column class-name="col-item" prop="Receive" label="Receive" width="100">
            <template #default="scope">
              <div class="tx-cell">
                <IconItem :iconMap="scope.row.Receive"></IconItem>
              </div>
            </template>
          </el-table-column>

          <el-table-column class-name="col-item" prop="Amount" label="Amount" width="150">
            <template #default="scope">
              <div class="tx-cell">
                <span>{{ scope.row.Amount }}&nbsp;</span>
                <span>{{ scope.row.Currency }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column class-name="col-item" prop="Date" sortable label="Date" width="100">
            <template #default="scope">
              <div class="tx-cell">
                <span>{{ scope.row.Date ? $filters.dateTimeFormat(scope.row.Date) : '--' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            class-name="col-item"
            prop="Process"
            label="Current/Necessary (Block)"
            width="150"
          >
            <template #default="scope">
              <div class="tx-cell">
                <span>{{ scope.row.Process ? scope.row.Process : '--/--' }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- <el-table-column class-name="col-item" prop="Date" label="Date" /> -->

          <el-table-column class-name="col-item" prop="State" label="States" fixed="right">
            <template #default="scope">
              <div class="tx-cell-img" v-if="scope.row.State == 'SUCCESS'">
                <el-icon :size="15" color="#fff"><Select /></el-icon>
              </div>
              <div class="tx-cell" v-else-if="scope.row.State == 'WAITING_REQUEST'">
                <el-button @click="retryRequest(scope.row)">{{ $t('retry') }}</el-button>
              </div>
              <div class="tx-cell" v-else>
                <span>{{ scope.row.State }}</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, toRaw, watch, computed } from 'vue'
import SwapItem from '@/components/Swap-Item/Swap-Item.vue'
import IconItem from '@/components/Icon-item/Icon-item.vue'
import mvc from '@/assets/images/icon_mvc.svg?url'
import twitter from '@/assets/images/twitter.svg?url'
import reddit from '@/assets/images/reddit.svg?url'
import instagram from '@/assets/images/instagram.svg?url'
import discord from '@/assets/images/discord.svg?url'
import { ArrowLeftBold, Select, HomeFilled, Back } from '@element-plus/icons-vue'
import Logo from '@/assets/images/logo_mvc.svg?url'
import WalletIcon from '@/assets/images/Wallets-icon.svg?url'
import HistoryIcon from '@/assets/images/History-icon.svg?url'
import FaucetIcon from '@/assets/images/Faucet.svg?url'
import Drawer from '@/components/Drawer/Drawer.vue'

import {
  MappingIcon,
  MappingChainName,
  CoinSymbol,
  WalletOrigin,
  ChainOrigin,
  CoinUint,
  NodeName,
  SdkPayType,
} from '@/enum'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { ElLoading } from 'element-plus'
import IconMetaMask from '@/assets/images/MetaMask_Fox.svg.svg?url'
import { formatUnits, toQuantity, verifyMessage, resolveAddress, Transaction } from 'ethers'
import { useRootStore } from '@/store/root'
import { useUserStore } from '@/store/user'
import {
  checkUserLogin,
  mappingChain,
  mappingCoin,
  mappingChainOrigin,
  getAccountUserInfo,
  ensConvertAddress,
  copy,
} from '@/utils/util'
import { RetryWaitRequest } from '@/utils/common'
import Decimal from 'decimal.js-light'
import { dateTimeFormat } from '@/utils/filters'
import { useI18n } from 'vue-i18n'
import { router } from '@/router'
enum OrderType {
  Pending = 'Pending',
  Finalize = 'Finalize',
}

const isHome = ref(true)
const env = ref(import.meta.env.MODE == 'prod' ? true : false)
const contractList: any[] = [
  //mvc, twitter, instagram, reddit, discord
  {
    icon: mvc,
    url: `https://www.show3.io/talk/channels/MVC.metaid/4c86…726a8831b55e9b9fc767bec613ea60630b03d117ab01bbc21`,
  },
  {
    icon: twitter,
    url: `https://twitter.com/mvcglobal`,
  },
  {
    icon: instagram,
    url: ``,
  },
  {
    icon: reddit,
    url: ``,
  },
  {
    icon: discord,
    url: `https://discord.com/invite/RGHWazu9eS`,
  },
]
const DrawerOperate = ref(false)
const innerDrawer = ref(false)
const formSize = ref('default')
const transferLoading = ref(false)
const ruleFormRef = ref<FormInstance>()
const rootStore = useRootStore()
const userStore = useUserStore()
const currentTransferType = ref()
const currentCoinUit = ref(CoinUint.Space)
const historyDialog = ref(false)
const loadingHistory = ref(false)
const i18n = useI18n()
const currentTableLayout = ref('')
const faucetLoading = ref(false)
const MetaNameOrEns = computed(() => {
  let mvc = [MappingIcon.MVC, MappingIcon.MUSDC, MappingIcon.MUSDT]
  return mvc.includes(currentTransferType.value)
})
const retryRequestLoading = ref(false)
interface TransationItem {
  Currency: string
  Send: string
  Receive: string
  Amount: string
  Date?: Number
  State: string
  NeedConfirm?: number
  CurrentConfirm?: number
  Process?: string
  fromAddress: string
  toAddress: string
  fromChain: string
  toChain: string
  TX: string
  fromAmount: string
}
const svg = `
        <path class="path" d="
          M 30 15
          L 28 17
          M 25.61 25.61
          A 15 15, 0, 0, 1, 15 30
          A 15 15, 0, 1, 1, 27.99 7.5
          L 15 15
        " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
      `
const transationHistoryList: TransationItem[] = reactive([])
onMounted(async () => {
  // const preMessage = '\u0019Ethereum Signed Message:\n'
  // const message = 'hello'
  // setTimeout(async () => {
  //   const signature = await rootStore.GetWeb3Wallet.signer.signMessage(preMessage + message)
  //   console.log('signature', signature)
  //   debugger
  // }, 5000)
  // const message = 'hello'
  // const res = await verifyMessage(
  //   preMessage + message.length,
  //   `0xfa847a842519f9031da788ce140ea49d3fd6343bdccd97edfb383bf6451832576daa24a990244d3b81c79ef62f7e4cb0af66449ec3a0165d1d2252ad1e23e7ad1c`
  // )
  // console.log('zxc2xczxcres', res)
  // const message = SignatureHelper.getSigningMessageFromOrder(registerRequest)
  // nextTick(() => {
  //   const node = document.querySelectorAll('.foot')[0]!
  //   const io = new IntersectionObserver((entries) => {
  //     entries.forEach((item) => {
  //       console.log('node', item)
  //     })
  //   })
  //   io.observe(node)
  // })
})

watch(
  () => historyDialog.value,
  (val: boolean) => {
    if (!val) {
      currentTableLayout.value = null
    }
  }
)

watch(
  () => innerDrawer.value,
  (val: boolean) => {
    if (val) {
      ruleForm.address = ''
      ruleForm.amount = ''
    }
  }
)

watch(
  () => DrawerOperate.value,
  async (val: boolean) => {
    if (val) {
      await rootStore.GetWeb3AccountBalance()
      walletList.forEach((item) =>
        item.coinList.forEach((coin) => {
          switch (coin.chainName) {
            case MappingIcon.MVC:
              coin.balance = rootStore.mvcWalletTokenBalance.space
              break
            case MappingIcon.BSC:
              coin.balance = rootStore.Web3WalletTokenBalance.currency
              break
            case MappingIcon.POLYGON:
              coin.balance = rootStore.Web3WalletTokenBalance.currency
              break
            case MappingIcon.ETH:
              coin.balance = rootStore.Web3WalletTokenBalance.currency
              break
            case MappingIcon.Tether:
              coin.balance = rootStore.Web3WalletTokenBalance.usdt
              break
            case MappingIcon.USD:
              coin.balance = rootStore.Web3WalletTokenBalance.usdc
              break
            case MappingIcon.MUSDT:
              coin.balance = rootStore.mvcWalletTokenBalance.usdt
              break
            // case MappingIcon.MUSDC:
            //   coin.balance = rootStore.mvcWalletTokenBalance.usdc
            //   break
          }
          coin.loading = false
        })
      )
    }
  }
)

type Coin = {
  chainName:
    | MappingIcon.ETH
    | MappingIcon.BSC
    | MappingIcon.POLYGON
    | MappingIcon.Tether
    | MappingIcon.USD
    | MappingIcon.MVC
    | MappingIcon.MUSDT
    | MappingIcon.MUSDC
  chainSymbol: CoinSymbol.ETH | CoinSymbol.USDT | CoinSymbol.USDC | CoinSymbol.SPACE
  loading: boolean
  balance: string
}
interface WalletInfo {
  chain: ChainOrigin.ETH | ChainOrigin.MVC | ChainOrigin.BSC | ChainOrigin.POLYGON
  coinList: Coin[]
}

const ruleForm = reactive({
  address: '',
  amount: '',
})
const userInfo: { val: undefined | UserAllInfo } = reactive({ val: undefined })
const rules = reactive<FormRules>({
  address: [{ required: true, message: 'Please input Transfer address', trigger: 'blur' }],
  amount: [
    {
      required: true,
      message: 'Please input Transfer amount',
      trigger: 'blur',
    },
  ],
})

function toSepoliaFauct() {
  window.open(`https://sepoliafaucet.com`, '_blank')
}

function toSpaceFaucet() {
  window.open(`https://witnessonchain.com/faucet/tspace`, '_blank')
}

async function faucet() {
  faucetLoading.value = true
  try {
    const res = await rootStore.GetWeb3Wallet.faucet.requestToken()
    console.log('resszxczx', res)
    faucetLoading.value = false
  } catch (error) {
    faucetLoading.value = false
    ElMessage.error(error.message)
  }
}

const handleCommand = (command: string | number | object) => {
  if (command == 'logout') {
    userStore.logout()
  }
}

const GetDecimal = computed(() => {
  switch (currentTransferType.value) {
    case MappingIcon.Tether:
    case MappingIcon.MUSDT:
      return 6
    case MappingIcon.MUSDC:
      return 8
    case MappingIcon.USD:
      return 6
  }
})

const list: Partial<OrderHistroyItem[]> = reactive([])

const currentContractOperate = computed(() => {
  if (currentTransferType.value == MappingIcon.MUSDT) {
    return {
      contract: null,
      codehash: rootStore.MvcFtList[0].codeHash,
      genesis: rootStore.MvcFtList[0].genesis,
    }
  } else {
    return {
      contract: null,
      codehash: rootStore.MvcFtList[1].codeHash,
      genesis: rootStore.MvcFtList[1].genesis,
    }
  }
})

function mappingFromChain(chain: string) {
  switch (chain) {
    case MappingChainName.ETH.toLocaleLowerCase():
      return MappingIcon.ETH
    case MappingChainName.MVC.toLocaleLowerCase():
      return MappingIcon.MVC
  }
}

function mappingFromToken(token: string) {
  switch (token) {
    case MappingIcon.USDT.toLocaleLowerCase():
      return MappingIcon.USDT
    case MappingIcon.USDC.toLocaleLowerCase():
      return MappingIcon.USDC
  }
}

async function AllPendingList() {
  const ethOrderWaitRes = await rootStore.GetOrderApi.orderFromChainFromTokenNameAddressPendingGet(
    MappingChainName.ETH.toLocaleLowerCase(),
    MappingIcon.USDT.toLocaleLowerCase(),
    rootStore.GetWeb3Wallet.signer.address.toLocaleLowerCase()
  ).catch((e) => console.log(e))
  const mvcOrderWaitRes = await rootStore.GetOrderApi.orderFromChainFromTokenNameAddressPendingGet(
    MappingChainName.MVC.toLocaleLowerCase(),
    MappingIcon.USDT.toLocaleLowerCase(),
    userStore.user?.address
  ).catch((e) => console.log(e))
  if (!ethOrderWaitRes?.data.length && mvcOrderWaitRes?.data.length) {
    list.push(...mvcOrderWaitRes.data)
  } else if (!mvcOrderWaitRes?.data.length && ethOrderWaitRes?.data.length) {
    list.push(...ethOrderWaitRes.data)
  } else if (ethOrderWaitRes?.data.length && mvcOrderWaitRes?.data.length) {
    list.push(...ethOrderWaitRes.data, ...mvcOrderWaitRes.data)
  }

  console.log('list', list)
}

async function AllHistoryList() {
  const ethOrderWaitRes =
    await rootStore.GetOrderApi.orderFromChainFromTokenNameAddressFinalizedGet(
      MappingChainName.ETH.toLocaleLowerCase(),
      MappingIcon.USDT.toLocaleLowerCase(),
      rootStore.GetWeb3Wallet.signer.address.toLocaleLowerCase()
    ).catch((e) => console.log(e))
  const mvcOrderWaitRes =
    await rootStore.GetOrderApi.orderFromChainFromTokenNameAddressFinalizedGet(
      MappingChainName.MVC.toLocaleLowerCase(),
      MappingIcon.USDT.toLocaleLowerCase(),
      userStore.user?.address
    ).catch((e) => console.log(e))
  // if (mvcOrderWaitRes?.data.length) {
  //   list.push(...mvcOrderWaitRes.data)
  // }
  if (!ethOrderWaitRes?.data.length && mvcOrderWaitRes?.data.length) {
    list.push(...mvcOrderWaitRes.data)
  } else if (!mvcOrderWaitRes?.data.length && ethOrderWaitRes?.data.length) {
    list.push(...ethOrderWaitRes.data)
  } else if (ethOrderWaitRes?.data.length && mvcOrderWaitRes?.data.length) {
    list.push(...ethOrderWaitRes.data, ...mvcOrderWaitRes.data)
  }

  console.log('list', list)
}
/**
         * Currency: string
  Send: string
  Receive: string
  Amount: string
  Date?: Number
  State: string
  NeedConfirm?: number
  CurrentConfirm?: number
  fromAddress: string
  toAddress: string
  fromChain: string
  toChain: string
  TX: string
  fromAmount: string
         * 
         */
async function getPendingList() {
  if (currentTableLayout.value == OrderType.Pending) {
    return
  }
  currentTableLayout.value = OrderType.Pending

  transationHistoryList.length = 0
  list.length = 0
  historyDialog.value = true
  loadingHistory.value = true
  try {
    await AllPendingList()
    if (!list.length) {
      loadingHistory.value = false
    }
    list.length &&
      list.forEach((ele, id) => {
        let item = {
          Currency: mappingFromToken(ele!.vaultId.split('_')[1]),
          Send: mappingFromChain(ele!.vaultId.split('_')[0]),
          Receive:
            ele?.vaultId.split('_')[0].toUpperCase() === MappingIcon.ETH
              ? MappingIcon.MVC
              : MappingIcon.ETH,
          Amount: new Decimal(ele!.fromAmount).div(10 ** 6).toString(),
          State: ele?.state,
          Date: ele?.finalizedTimestamp,
          NeedConfirm: ele?.confirmationRequired,
          CurrentConfirm: ele?.currentConfirmation,
          Process: `${ele?.currentConfirmation}/${ele?.confirmationRequired}`,
          TX: ele.txid,
          fromAmount: ele!.fromAmount,
          fromAddress: ele.fromAddress,
          toAddress:
            ele?.vaultId.split('_')[0].toUpperCase() === MappingIcon.ETH
              ? userStore.user.address
              : rootStore.GetWeb3Wallet.signer.address,
          fromChain: ele!.vaultId.split('_')[0],
          toChain:
            ele?.vaultId.split('_')[0].toUpperCase() === MappingIcon.ETH
              ? MappingIcon.MVC.toLowerCase()
              : MappingIcon.ETH.toLowerCase(),
        }
        transationHistoryList.push(item)
      })
    loadingHistory.value = false
  } catch (error) {
    loadingHistory.value = false
    return ElMessage.error(`${(error as any).toString()}`)
  }
}

async function getHistoryList() {
  if (currentTableLayout.value == OrderType.Finalize) {
    return
  }
  currentTableLayout.value = OrderType.Finalize
  transationHistoryList.length = 0
  list.length = 0
  historyDialog.value = true
  loadingHistory.value = true
  try {
    await AllHistoryList()
    if (!list.length) {
      loadingHistory.value = false
    }
    list.length &&
      list.forEach((ele, id) => {
        let item = {
          Currency: mappingFromToken(ele!.vaultId.split('_')[1]),
          Send: mappingFromChain(ele!.vaultId.split('_')[0]),
          Receive:
            ele?.vaultId.split('_')[0].toUpperCase() === MappingIcon.ETH
              ? MappingIcon.MVC
              : MappingIcon.ETH,
          Amount: new Decimal(ele!.fromAmount).div(10 ** 6).toString(),
          State: ele?.state,
          Date: ele?.finalizedTimestamp,
          NeedConfirm: ele?.confirmationRequired,
          CurrentConfirm: ele?.currentConfirmation,
          TX: ele.txid,
          fromAmount: ele!.fromAmount,
          fromAddress: ele.fromAddress,
          toAddress:
            ele?.vaultId.split('_')[0].toUpperCase() === MappingIcon.ETH
              ? userStore.user.address
              : rootStore.GetWeb3Wallet.signer.address,
          fromChain: ele!.vaultId.split('_')[0],
          toChain:
            ele?.vaultId.split('_')[0].toUpperCase() === MappingIcon.ETH
              ? MappingIcon.MVC.toLowerCase()
              : MappingIcon.ETH.toLowerCase(),
        }
        transationHistoryList.push(item)
      })
    loadingHistory.value = false
  } catch (error) {
    loadingHistory.value = false
    return ElMessage.error(`${(error as any).toString()}`)
  }
}

async function retryRequest(params: TransationItem) {
  console.log('params', params)

  try {
    loadingHistory.value = true
    const res = await RetryWaitRequest(params).catch((e) => {
      loadingHistory.value = false
      ElMessage.error(`request fail:${e}`)
    })
    if (res) {
      loadingHistory.value = false
      ElMessage.success(`${i18n.t(`Retry success`)}`)
    } else {
      loadingHistory.value = false
      ElMessage.error(`request fail`)
    }
  } catch (error) {
    loadingHistory.value = false
    ElMessage.error(`request fail:${error}`)
  }
}

function selectCoinTransfer(coin: string) {
  console.log('coin', coin)
  innerDrawer.value = true
  currentTransferType.value = coin
}

function checkWalletInfo() {
  if (userStore.user?.evmAddress) {
    DrawerOperate.value = true
  } else {
    ConnectWallet()
  }
}

function transferFt() {
  return new Promise(async (resolve, reject) => {
    const value = new Decimal(ruleForm.amount).mul(Math.pow(10, GetDecimal.value)).toString()

    const res = await userStore.showWallet
      .TransferFt(
        {
          nodeName: NodeName.FtTransfer,
          data: JSON.stringify({
            receivers: [
              {
                address: userInfo.val!.address,
                amount: value,
              },
            ],
            codehash: currentContractOperate.value.codehash,
            genesis: currentContractOperate.value.genesis,
          }),
        },
        {
          payType: SdkPayType.SPACE,
          isBroadcast: true,
        }
      )
      .catch((error) => {
        ElMessage.error(error.message)
        throw new Error(error.toString())
      })
    if (res) {
      resolve(res)
    } else {
      reject()
    }
  })
}

function transferSpace() {
  return new Promise(async (resolve, reject) => {
    const value =
      currentCoinUit.value == CoinUint.Space
        ? new Decimal(ruleForm.amount).mul(Math.pow(10, 8)).toNumber()
        : new Decimal(ruleForm.amount).toNumber()
    const res = await userStore.showWallet
      .sendMoney([
        {
          amount: value,
          address: userInfo.val!.address,
        },
      ])
      .catch((error) => {
        ElMessage.error(error.message)
        throw new Error(error.toString())
      })

    // const res = await userStore.showWallet
    //   .createBrfcChildNode(
    //     {
    //       nodeName: NodeName.SendMoney,
    //       payTo: [
    //         {
    //           amount: value,
    //           address: userInfo.val!.address,
    //         },
    //       ],
    //     },
    //     {
    //       payType: SdkPayType.SPACE,
    //     }
    //   )
    //   .catch((error) => {
    //     ElMessage.error(error.message)
    //     throw new Error(error.toString())
    //   })
    if (res) {
      resolve(res)
    } else {
      reject()
    }
  })
}

const TransferConfrim = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  let toAddress
  try {
    console.log('currentTransferType', currentTransferType.value)

    await formEl.validate(async (valid, fields) => {
      transferLoading.value = true
      if (valid) {
        let res
        if (currentTransferType.value == MappingIcon.MVC) {
          const target = await getAccountUserInfo(ruleForm.address).catch((e: any) => {
            transferLoading.value = false
            ElMessage.error(e.toString())
            throw new Error(e.message)
          })
          if (target) {
            userInfo.val = target
            await transferSpace()
          } else {
            transferLoading.value = false
          }
        } else if (currentTransferType.value == MappingIcon.ETH) {
          toAddress = await ensConvertAddress(ruleForm.address.trim()).catch((e) => {
            return ElMessage.error(e.toString())
          })
          const tx = {
            to: toAddress,
            value: toQuantity(new Decimal(ruleForm.amount).mul(10 ** 18).toString()),
          }
          res = await rootStore.GetWeb3Wallet.signer.sendTransaction(tx).catch((e: any) => {
            transferLoading.value = false
            return ElMessage.error(`Transfer cancel!`)
          })
          await res.wait()
        } else if (
          currentTransferType.value == MappingIcon.Tether ||
          currentTransferType.value == MappingIcon.USD
        ) {
          const decimal = GetDecimal.value!

          toAddress = await ensConvertAddress(ruleForm.address.trim()).catch((e) => {
            return ElMessage.error(e.toString())
          })
          const value = toQuantity(new Decimal(ruleForm.amount).mul(10 ** decimal).toString())
          res = await rootStore.GetWeb3Wallet.usdt.transfer(toAddress, value).catch((e: any) => {
            transferLoading.value = false
            return ElMessage.error(`Transfer cancel!`)
          })
          await res.wait()
        } else if (
          currentTransferType.value == MappingIcon.MUSDT ||
          currentTransferType.value == MappingIcon.MUSDC
        ) {
          const target = await getAccountUserInfo(ruleForm.address).catch((e: any) => {
            transferLoading.value = false
            ElMessage.error(e.message)
            throw new Error(e.message)
          })
          if (target) {
            userInfo.val = target
            await transferFt()
          } else {
            transferLoading.value = false
          }
        } else {
          transferLoading.value = false
          console.log('submit!')
        }
        ElMessage.success(`Transfer success!`)
        transferLoading.value = false
        innerDrawer.value = false
      }
    })
  } catch (error) {
    transferLoading.value = false
  }
}

const walletList: WalletInfo[] = reactive([
  {
    chain: mappingChainOrigin((window as any)?.ethereum?.chainId),
    coinList: [
      {
        chainName: mappingChain((window as any)?.ethereum?.chainId),
        chainSymbol: mappingCoin((window as any)?.ethereum?.chainId),
        loading: true,
        balance: '0',
      },
      {
        chainName: MappingIcon.Tether,
        chainSymbol: CoinSymbol.USDT,
        loading: true,
        balance: '0',
      },
      {
        chainName: MappingIcon.USD,
        chainSymbol: CoinSymbol.USDC,
        loading: true,
        balance: '0',
      },
    ],
  },
  {
    chain: ChainOrigin.MVC,
    coinList: [
      {
        chainName: MappingIcon.MVC,
        chainSymbol: CoinSymbol.SPACE,
        loading: true,
        balance: '0',
      },
      {
        chainName: MappingIcon.MUSDT,
        chainSymbol: CoinSymbol.MUSDT,
        loading: true,
        balance: '0',
      },
      // {
      //   chainName: MappingIcon.MUSDC,
      //   chainSymbol: CoinSymbol.MUSDC,
      //   loading: true,
      //   balance: '0',
      // },
    ],
  },
])

async function ConnectWallet() {
  await checkUserLogin()
}

function toLink(url: string) {
  if (!url) return
  window.open(url, '_blank')
}
</script>

<style lang="scss" src="./index.scss"></style>

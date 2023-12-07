<template>
  <div class="item-wrap">
    <div class="top">
      <div class="chain-origin">From</div>

      <div class="chain-select" @click="selectChainDialog = false">
        <div class="left">
          <IconItem :chainMap="fromChain"></IconItem>
        </div>
        <div class="right" v-if="false">
          <el-icon :size="16">
            <ArrowDownBold />
          </el-icon>
        </div>
      </div>
    </div>
    <div class="input-wrap">
      <div class="input-inner-wrap">
        <div class="title">Send：</div>
        <div class="input-container">
          <!-- <el-input
            v-model="sendInput"
            placeholder="0.0"
            :formatter="(value:any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="(value:any) => value.replace(/^0\d{0,1}$/g,'').replace(/\D+/g,'').replace(/[0-9]{19}$/g,'').replace(/\$\s?|(,*)/g, '')"
          /> -->
          <el-input
            v-model="sendInput"
            placeholder="0.0"
            :formatter="(value:any) => value.replace(/[^\d^\.]+/g,'').replace(/[0-9]{19}$/g,'').replace(/\$\s?|(,*)/g, '')"
          />

          <div class="chain-select" @click="selectCoinDialog = false">
            <div class="left">
              <IconItem :iconMap="currentCoin"></IconItem>
            </div>
            <!-- <div class="right">
              <el-icon :size="16">
                <ArrowDownBold />
              </el-icon>
            </div> -->
          </div>
        </div>
        <div class="balance">
          <span @click="sendInput = allowInputBalance"
            >{{ $t('max') }}{{ allowInputBalance.toLocaleString() }}</span
          >
        </div>
        <div class="tips" v-if="amountMostThan">
          {{
            +sendInput > +allowInputBalance
              ? $t('input amount over hold')
              : `input amount is not less than ${minumSend}`
          }}
        </div>
      </div>
    </div>

    <div class="exchangIcon">
      <img :src="ConvertIcon" alt="" @click="triggleChain" />
    </div>

    <div class="top">
      <div class="chain-origin">To</div>

      <div class="chain-select">
        <div class="left">
          <IconItem :chainMap="curretnToChain"></IconItem>
        </div>
        <div class="right" v-if="false">
          <el-icon :size="16">
            <ArrowDownBold />
          </el-icon>
        </div>
      </div>
    </div>
    <div class="input-wrap">
      <div class="input-inner-wrap">
        <div class="title">Receive (estimated) :</div>
        <div class="input-container">
          <el-input
            :formatter="(value:any) => value.replace(/[^\d^\.]+/g,'').replace(/[0-9]{19}$/g,'').replace(/\$\s?|(,*)/g, '')"
            :value="receiveInput"
            placeholder="0.0"
          />
          <div class="chain-select" @click="selectCoinDialog = false">
            <div class="left">
              <IconItem :iconMap="currentCoin"></IconItem>
            </div>
            <!-- <div class="right">
              <el-icon :size="16">
                <ArrowDownBold />
              </el-icon>
            </div> -->
          </div>
        </div>
      </div>
    </div>

    <div class="swap-btn">
      <el-button @click="Swap" :disabled="allowSwap">Swap</el-button>
    </div>
  </div>

  <Dialog v-model="selectChainDialog">
    <template #title>
      <div>Select Source Chain</div>
    </template>
    <template #content>
      <div class="chain-select">
        <IconItem
          class="item"
          @click=";(currentFromChain = item), (selectChainDialog = false)"
          v-for="item in supportChain"
          :chainMap="item"
        ></IconItem>
      </div>
    </template>
  </Dialog>

  <Dialog v-model="selectCoinDialog">
    <template #title>
      <div>Select a token</div>
    </template>
    <template #content>
      <div class="coin-select">
        <div
          class="item"
          @click=";(currentAssert = item.coin), (selectCoinDialog = false)"
          v-for="item in CoinList"
        >
          <IconItem :iconMap="item.coin"></IconItem>
          <span>{{ item.symbol }}</span>
        </div>
      </div>
    </template>
  </Dialog>

  <Dialog
    v-model="transationDetailDialog"
    :hasCustomClass="swapSuccess ? '' : 'txDialog'"
    @cancel="resetEstimatedInfo"
  >
    <template #title>
      <div>{{ swapSuccess ? '' : 'Summary' }}</div>
    </template>
    <template #content>
      <div class="swapSuccessWrap" v-if="swapSuccess">
        <div class="icon">
          <el-icon><Select /></el-icon>
        </div>
        <div class="success">Successful Transaction</div>
        <el-button @click="confrimSuccess" class="success-btn">OK</el-button>
      </div>
      <div
        class="txInfo"
        v-else
        element-loading-text="Transaction sending"
        v-loading.fullscreen.lock="swapLoading"
        element-loading-background="rgba(122, 122, 122, 0.8)"
      >
        <div class="item" v-for="item in txInfo">
          <span class="title">{{ item.title }}</span>

          <div class="symbol">
            <span class="amount">{{ item.value() }}</span>
            <span>{{ item.decimal() }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #footer v-if="!swapSuccess">
      <div class="minimumReceived">
        <span class="title">{{ minimumReceived.val.title }}</span>
        <div class="symbol">
          <span class="amount">{{ minimumReceived.val.value() }}</span>
          <span>{{ minimumReceived.val.decimal() }}</span>
        </div>
      </div>
      <el-button :disabled="ConfrimSwapDisable" @click="confrimSwap" class="txBtn">
        {{ ConfrimSwapDisable ? 'Estimated...' : 'OK' }}
      </el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ArrowDownBold, Select } from '@element-plus/icons-vue'
import { reactive, ref, computed, onMounted } from 'vue'
import {
  MappingIcon,
  MappingChainName,
  CoinSymbol,
  NodeName,
  SdkPayType,
  CoinDecimal,
  ChainTypeBalance,
  ETHChain,
  ReceiverChainName,
} from '@/enum'
import IconItem from '@/components/Icon-item/Icon-item.vue'
import ConvertIcon from '@/assets/images/icon_Convert.svg?url'
import Dialog from '@/components/Dialog/Dialog.vue'
import { useUserStore } from '@/store/user'
import { useRootStore } from '@/store/root'
import { ElMessage } from 'element-plus'
import {
  mappingChainName,
  GeneratorSignatrue,
  checkAmount,
  mappingCurrentChainName,
} from '@/utils/util'
import Decimal from 'decimal.js-light'
import { toQuantity } from 'ethers'

import { OrderRegisterRequest } from 'mvcbridge-sdk/api'
import { SignatureHelper } from 'mvcbridge-sdk/signature'
import { GetReceiveAddress, registerOrder, waitOrderList } from '@/api/api'

import { useI18n } from 'vue-i18n'

const selectChainDialog = ref(false)
const selectCoinDialog = ref(false)
const transationDetailDialog = ref(false)
const swapSuccess = ref(false)
const i18n = useI18n()
const sendInput = ref(null)
const isETHorLayer2 = reactive([MappingChainName.ETH, MappingChainName.ARB, MappingChainName.OP])
const currentChainName = ref(ReceiverChainName.ETH)

onMounted(() => {
  ;(window as any)?.ethereum?.on('networkChanged', (networkIDstring: string[]) => {
    if (curretnToChain.value === MappingChainName.MVC) {
      currentFromChain.value = mappingChainName((window as any)?.ethereum?.chainId)
    } else {
      curretnToChain.value = mappingChainName((window as any)?.ethereum?.chainId)
    }
    setCurrentChainName()
    rootStore.setCurretnETHChain(ETHChain[currentChainName.value.toLocaleUpperCase()])
  })
})

const receiveInput = computed(() => {
  if (!sendInput.value) {
    return null
  }
  if (+sendInput.value < +minumSend.value) {
    return null
  }
  if (new Decimal(sendInput.value).sub(minumSend.value).toNumber() < 0) {
    return null
  }
  if (isETHorLayer2.includes(fromChain.value)) {
    return new Decimal(sendInput.value)
      .sub(new Decimal(sendInput.value).mul(rootStore.receiverInfo.mvc.withdrawBridgeFeeRate))
      .sub(
        new Decimal(rootStore.receiverInfo.mvc.withdrawGasFee).div(
          10 ** rootStore.receiverInfo.mvc.decimal
        )
      )
      .sub(
        new Decimal(rootStore.receiverInfo.mvc.withdrawBridgeFeeFixed).div(
          10 ** rootStore.receiverInfo.mvc.decimal
        )
      )
      .toString()
  } else if (fromChain.value == MappingChainName.MVC) {
    return new Decimal(sendInput.value)
      .sub(new Decimal(sendInput.value).mul(rootStore.receiverInfo.eth.withdrawBridgeFeeRate))
      .sub(
        new Decimal(rootStore.receiverInfo.eth.withdrawGasFee).div(
          10 ** rootStore.receiverInfo.eth.decimal
        )
      )
      .sub(
        new Decimal(rootStore.receiverInfo.eth.withdrawBridgeFeeFixed).div(
          10 ** rootStore.receiverInfo.eth.decimal
        )
      )
      .toString()
  }
})
const amountMostThan = computed(() => {
  return +sendInput.value < +minumSend.value || +sendInput.value > +allowInputBalance.value
})

const allowInputBalance = computed(() => {
  if (userStore.isAuthorized) {
    console.log('fromChain.value', fromChain.value)

    switch (fromChain.value) {
      case MappingChainName.ETH:
      case MappingChainName.OP:
      case MappingChainName.ARB:
        return parseFloat(rootStore.Web3WalletTokenBalance.usdt)
      case MappingChainName.MVC:
        return parseFloat(rootStore.mvcWalletTokenBalance.usdt)
    }
  } else {
    return 0
  }
})

const allowSwap = computed(() => {
  if (
    sendInput.value &&
    receiveInput.value &&
    !amountMostThan.value &&
    +sendInput.value <= +allowInputBalance.value
  ) {
    return false
  } else {
    return true
  }
})
const swapLoading = ref(false)
const rootStore = useRootStore()
const userStore = useUserStore()

const currentContractOperate = computed(() => {
  if (isETHorLayer2.includes(fromChain.value)) {
    if (currentAssert.value == MappingIcon.USDT) {
      return {
        contract: rootStore.GetWeb3Wallet.usdt,
        decimal: CoinDecimal.USDT,
      }
    }
  } else {
    if (currentAssert.value == MappingIcon.USDT) {
      return {
        contract: null,
        codehash: rootStore.MvcFtList[0].codeHash,
        genesis: rootStore.MvcFtList[0].genesis,
        decimal: CoinDecimal.USDT,
      }
    } else {
      return {
        contract: null,
        codehash: rootStore.MvcFtList[1].codeHash,
        genesis: rootStore.MvcFtList[1].genesis,
        decimal: CoinDecimal.USDC,
      }
    }
  }
})

const recevierInfo: { val: Partial<GetReceiveAddressType> | null } = reactive({
  val: {},
})

const mvcTokenDecimal = computed(() => {
  return 8
})

const curretnToChain = ref(MappingChainName.MVC)
const currentAssert = ref(MappingIcon.USDT)
const currentWalletChain = ref((window as any)?.ethereum?.chainId)
const currentFromChain = ref(mappingChainName(currentWalletChain.value))

const fromChain = computed(() => {
  switch (currentFromChain.value) {
    case MappingChainName.Ethereum:
    case MappingChainName.ETH:
      return MappingChainName.ETH
    case MappingChainName.Polygon:
      return MappingChainName.Matic
    case MappingChainName.BNB:
      return MappingChainName.Bsc
    case MappingChainName.MVC:
      return MappingChainName.MVC
    case MappingChainName.OP:
      return MappingChainName.OP
    case MappingChainName.ARB:
      return MappingChainName.ARB
    default:
      return MappingChainName.ETH
  }
})

const SendAssert = computed(() => {
  if (fromChain.value == MappingChainName.ETH) {
    return MappingIcon.USDT
  } else {
    return MappingIcon.MUSDT
  }
})

const ReceiveAssert = computed(() => {
  if (fromChain.value == MappingChainName.ETH) {
    return MappingIcon.MUSDT
  } else {
    return MappingIcon.USDT
  }
})

const currentCoin = computed(() => {
  switch (currentAssert.value) {
    case MappingIcon.Tether:
    case MappingIcon.USDT:
      return MappingIcon.USDT
    case MappingIcon.USD:
    case MappingIcon.USDC:
      return MappingIcon.USDC
  }
})

const supportChain = reactive([
  MappingChainName.Ethereum,
  MappingChainName.OP,
  MappingChainName.ARB,
  // MappingChainName.Polygon,
  // MappingChainName.BNB,
])
const CoinList = reactive([
  {
    coin: MappingIcon.Tether,
    symbol: CoinSymbol.USDT,
  },
  {
    coin: MappingIcon.USD,
    symbol: CoinSymbol.USDC,
  },
])

const txInfo = reactive([
  {
    title: `You‘re moving`,
    value: () => estimatedTransferInfo.val.send,
    decimal: () => currentCoin.value,
  },
  {
    title: `You‘re pay in bridge fees`,
    value: () => estimatedTransferInfo.val.brigefee,
    decimal: () => currentCoin.value,
  },
  {
    title: `You‘re pay in bridge feeFixed`,
    value: () => estimatedTransferInfo.val.brigefeeFixed,
    decimal: () => currentCoin.value,
  },
  {
    title: `You‘re pay in gas fees`,
    value: () => estimatedTransferInfo.val.gasFee,
    decimal: () => currentCoin.value,
  },
  {
    title: `Estimated Time of Arrival`,
    value: () =>
      currentFromChain.value === MappingChainName.MVC
        ? new Decimal(estimatedTransferInfo.val.time).mul(10).toFixed(0)
        : new Decimal(estimatedTransferInfo.val.time).mul(12).div(60).toFixed(0),
    decimal: () => 'minutes',
  },
])

const minumSend = computed(() => {
  console.log('rootStore.receiverInfo', rootStore.receiverInfo)

  if (
    currentFromChain.value === MappingChainName.Ethereum ||
    currentFromChain.value === MappingChainName.ETH ||
    currentFromChain.value === MappingChainName.ARB ||
    currentFromChain.value === MappingChainName.OP
  ) {
    return new Decimal(rootStore.GetReceiverInfo.eth.depositMinAmount)
      .div(10 ** rootStore.GetReceiverInfo.eth.decimal)
      .toString()
  } else if (currentFromChain.value === MappingChainName.MVC) {
    return new Decimal(rootStore.GetReceiverInfo.mvc.depositMinAmount)
      .div(10 ** rootStore.GetReceiverInfo.mvc.decimal)
      .toString()
  }
})

const estimatedTransferInfo = reactive({
  val: {
    send: '',
    brigefee: '',
    gasFee: '',
    minSendAmount: '',
    time: 0,
    minerFee: '',
    minimumReceived: '',
    brigefeeFixed: '',
  },
})

const ConfrimSwapDisable = ref(true)

const minimumReceived = reactive({
  val: {
    title: 'Minimum Received',
    value: () => estimatedTransferInfo.val.minimumReceived,
    decimal: () => currentCoin.value,
  },
})

function setCurrentChainName() {
  switch (mappingCurrentChainName((window as any)?.ethereum?.chainId)) {
    case ReceiverChainName.ETH:
      currentChainName.value = ReceiverChainName.ETH
    case ReceiverChainName.OP:
      currentChainName.value = ReceiverChainName.OP
    case ReceiverChainName.ARB:
      currentChainName.value = ReceiverChainName.ARB
  }
}

function resetEstimatedInfo() {
  estimatedTransferInfo.val = {
    send: '',
    brigefee: '',
    minSendAmount: '',
    gasFee: '',
    time: 0,
    minerFee: '',
    minimumReceived: '',
    brigefeeFixed: '',
  }
}

// async function estimatedGasPrice(params: { amount: string; address: string }) {
//   try {
//     const value = toQuantity(
//       new Decimal(params.amount).mul(10 ** currentContractOperate.value.decimal).toString()
//     )
//     const tx = {
//       from: rootStore.GetWeb3Wallet.signer.address,
//       to: params.address,
//       data: currentContractOperate.value.contract.interface.encodeFunctionData('transfer', [
//         params.address,
//         value,
//       ]),
//     }

//     const res = await rootStore.GetWeb3Wallet.provider.estimateGas(tx)

//     if (res) {
//       const eth_USD_Rate = rootStore.exchangeRate.find((item) => item.symbol === 'eth')
//       return new Decimal(res.toString())
//         .add(21000)
//         .div(10 ** 9)
//         .mul(eth_USD_Rate!.price.USD)
//         .toNumber()
//         .toFixed(6)
//     } else {
//       return '0'
//     }
//   } catch (error) {
//     console.log(error)
//     return '0'
//   }
// }
function estimatedGasPrice(params) {
  return new Decimal(params.withdrawGasFee).div(10 ** params.decimal).toString()
}

async function Swap() {
  try {
    if (userStore.user) {
      let params
      transationDetailDialog.value = true
      swapSuccess.value = false
      ConfrimSwapDisable.value = true
      estimatedTransferInfo.val.send = sendInput.value
      await rootStore.setReceiverAddress(currentChainName.value)
      // recevierInfo.val = await GetReceiveAddress({
      //   chainName: fromChain.value!,
      //   tokenName: currentAssert.value,
      // })

      if (isETHorLayer2.includes(fromChain.value)) {
        console.log('sedddd', sendInput.value)
        // params = {
        //   amount: sendInput.value,
        //   address: recevierInfo.val.address,
        // }
        estimatedTransferInfo.val.brigefee = new Decimal(sendInput.value)
          .mul(rootStore.receiverInfo.mvc.withdrawBridgeFeeRate)
          .toString()
        estimatedTransferInfo.val.minSendAmount = new Decimal(
          rootStore.receiverInfo.eth.depositMinAmount
        )
          .div(10 ** rootStore.receiverInfo.eth.decimal)
          .toString()
        estimatedTransferInfo.val.brigefeeFixed = new Decimal(
          rootStore.receiverInfo.mvc.withdrawBridgeFeeFixed
        )
          .div(10 ** rootStore.receiverInfo.mvc.decimal)
          .toString()
        estimatedTransferInfo.val.time = rootStore.receiverInfo.eth.depositConfirmation
        estimatedTransferInfo.val.gasFee = estimatedGasPrice(rootStore.receiverInfo.mvc)
        estimatedTransferInfo.val.minimumReceived = new Decimal(sendInput.value)
          .sub(estimatedTransferInfo.val.brigefee)
          .sub(estimatedTransferInfo.val.gasFee)
          .sub(estimatedTransferInfo.val.brigefeeFixed)
          .toString()
        ConfrimSwapDisable.value = false
      } else if (fromChain.value === MappingChainName.MVC) {
        params = {
          amount: new Decimal(sendInput.value)
            .mul(10 ** rootStore.receiverInfo.mvc.decimal)
            .toString(),
          address: rootStore.receiverInfo.mvc.address,
        }

        estimatedTransferInfo.val.brigefee = new Decimal(sendInput.value)
          .mul(rootStore.receiverInfo.eth.withdrawBridgeFeeRate)
          .toString()
        estimatedTransferInfo.val.brigefeeFixed = new Decimal(
          rootStore.receiverInfo.eth.withdrawBridgeFeeFixed
        )
          .div(10 ** rootStore.receiverInfo.eth.decimal)
          .toString()
        estimatedTransferInfo.val.minSendAmount = new Decimal(
          rootStore.receiverInfo.mvc.depositMinAmount
        )
          .div(10 ** rootStore.receiverInfo.mvc.decimal)
          .toString()
        estimatedTransferInfo.val.time = rootStore.receiverInfo.mvc.depositConfirmation
        estimatedTransferInfo.val.gasFee = estimatedGasPrice(rootStore.receiverInfo.eth)
        estimatedTransferInfo.val.minimumReceived = new Decimal(sendInput.value)
          .sub(estimatedTransferInfo.val.brigefee)
          .sub(estimatedTransferInfo.val.gasFee)
          .sub(estimatedTransferInfo.val.brigefeeFixed)
          .toString()
        const estimatedRes: any = await estimatedTransferFtFee(params)
        if (estimatedRes) {
          estimatedTransferInfo.val.minerFee = estimatedRes!.minerFee!
        } else {
          return (ConfrimSwapDisable.value = true)
        }
        ConfrimSwapDisable.value = false
      }
    } else {
      return ElMessage.error(`Please login first`)
    }
  } catch (error) {
    ConfrimSwapDisable.value = true
    return ElMessage.error(error.toString())
  }
}

async function estimatedTransferFtFee(params: { amount: string; address: string }) {
  try {
    const res = await userStore.showWallet.TransferFt(
      {
        nodeName: NodeName.FtTransfer,
        data: JSON.stringify({
          receivers: [
            {
              address: params.address,
              amount: params.amount,
            },
          ],
          codehash: currentContractOperate.value.codehash,
          genesis: currentContractOperate.value.genesis,
        }),
      },
      {
        payType: SdkPayType.SPACE,
        isBroadcast: false,
      }
    )

    // const mvcRate = rootStore.exchangeRate.find((item) => item.symbol === 'mvc')
    const { inputAmount, outputAmount } = res?.ft?.transfer?.transaction
    // const needFee = res?.ft?.transfer?.transaction?.getNeedFee()

    // if (needFee) {
    //   return {
    //     minerFee: new Decimal(needFee).div(10 ** 8).toString(),
    //   }
    // }
    if (!inputAmount || !outputAmount) {
      throw new Error(`input is not found,estimated miner fee fail`)
    }
    return {
      minerFee: new Decimal(inputAmount)
        .sub(outputAmount)
        .div(10 ** 8)
        .toString(),
    }
  } catch (error: any) {
    throw new Error(error.toString())
  }
}

function triggleChain() {
  let temp = fromChain.value!
  currentFromChain.value = curretnToChain.value
  curretnToChain.value = temp
}

async function confrimSwap() {
  try {
    if (!userStore.user) return ElMessage.error(`User unLogin,Please check login status!`)
    if (+sendInput.value < +estimatedTransferInfo.val.minSendAmount)
      return ElMessage.error(
        `The transaction amount needs to be at least ${estimatedTransferInfo.val.minSendAmount} USDT`
      )
    swapLoading.value = true
    if (isETHorLayer2.includes(fromChain.value)) {
      await rootStore.GetWeb3AccountBalance(ChainTypeBalance.ETH).catch(() => {
        throw new Error(`GetBalance fail.`)
      })
      await checkAmount({
        chain: ChainTypeBalance.ETH,
        currency: estimatedTransferInfo.val.gasFee,
        token: {
          symbol: currentCoin.value!,
          amount: sendInput.value,
        },
      }).catch((e) => {
        throw new Error(e)
      })
      const value = toQuantity(
        new Decimal(sendInput.value).mul(10 ** currentContractOperate.value.decimal).toString()
      )
      console.log('rootStore.receiverInfo.eth.address', rootStore.receiverInfo.eth.address)

      const tx = await currentContractOperate.value.contract
        .transfer(`${rootStore.receiverInfo.eth.address}`, value)
        .catch((e: any) => {
          swapLoading.value = false
          throw new Error(`Cancel Transfer`)
        })
      if (tx) {
        // await tx.wait()
        const registerRequest: OrderRegisterRequest = {
          fromChain: rootStore.curretnETHChain, //fromChain.value.toLowerCase(),
          fromTokenName: currentCoin.value!.toLowerCase(),
          txid: tx.hash,
          amount: new Decimal(sendInput.value)
            .mul(10 ** currentContractOperate.value.decimal)
            .toString(),
          fromAddress: rootStore.Web3WalletSdk.signer.address,
          toChain: curretnToChain.value.toLowerCase(),
          toTokenName: currentCoin.value!.toLowerCase(),
          toAddress: userStore.user.address,
        }
        console.log('registerRequest', registerRequest)

        const message = SignatureHelper.getSigningMessageFromOrder(registerRequest)

        const sign = await rootStore.GetWeb3Wallet.signer.signMessage(message)
        if (sign) {
          registerRequest.signature = sign
          console.log('registerRequest', registerRequest)
          await retryOrderRequest(
            {
              fromChain: rootStore.curretnETHChain, //fromChain.value.toLowerCase(),
              fromTokenName: currentCoin.value!.toLowerCase(),
              address: rootStore.Web3WalletSdk.signer.address,
              txHash: tx.hash,
            },
            1
          ).catch((e) => {
            console.log(e)
          })

          // if (!orderWaitRes) throw new Error(`deposit tx not found`)
          rootStore.GetOrderApi.orderRegisterPost(registerRequest)
            .then(async (order: any) => {
              await tx.wait()
              await rootStore.GetWeb3AccountBalance()
              console.log('order', order)
            })
            .catch(async (e: any) => {
              await tx.wait()
              await rootStore.GetWeb3AccountBalance()
              throw new Error(e)
            })
        }
      }
    } else if (fromChain.value === MappingChainName.MVC) {
      await rootStore.GetWeb3AccountBalance(ChainTypeBalance.MVC).catch(() => {
        throw new Error(`GetBalance fail.`)
      })
      await checkAmount({
        chain: ChainTypeBalance.MVC,
        currency: estimatedTransferInfo.val.minerFee,
        token: {
          symbol: currentCoin.value!,
          amount: sendInput.value,
        },
      }).catch((e) => {
        throw new Error(e)
      })
      // console.log(
      //   'rootStore.receiverInfo.mvc.address',
      //   rootStore.receiverInfo.mvc.address,
      //   new Decimal(sendInput.value).mul(10 ** currentContractOperate.value.decimal).toString()
      // )

      const tx = await userStore.showWallet
        .TransferFt(
          {
            nodeName: NodeName.FtTransfer,
            data: JSON.stringify({
              receivers: [
                {
                  address: rootStore.receiverInfo.mvc.address,
                  amount: new Decimal(sendInput.value)
                    .mul(10 ** currentContractOperate.value.decimal)
                    .toString(),
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
        .catch((e) => {
          swapLoading.value = false
          throw new Error(e)
        })

      console.log('tx12312', userStore.user)

      if (tx?.ft?.transfer?.txId) {
        const registerRequest = GeneratorSignatrue({
          fromChain: fromChain.value.toLowerCase(),
          fromTokenName: currentCoin.value!.toLowerCase(),
          txid: tx?.ft?.transfer?.txId,
          amount: new Decimal(sendInput.value).mul(10 ** 6).toString(),
          fromAddress: userStore.user!.address,
          toChain: curretnToChain.value.toLowerCase(),
          toTokenName: currentCoin.value!.toLowerCase(),
          toAddress: rootStore.GetWeb3Wallet.signer.address,
        })

        console.log('registerRequest', registerRequest)
        await retryOrderRequest(
          {
            fromChain: fromChain.value.toLowerCase(),
            fromTokenName: currentCoin.value!.toLowerCase(),
            address: userStore.user!.address,
            txHash: tx?.ft?.transfer?.txId,
          },
          1
        ).catch((e) => {
          console.log(e)
        })

        // if (!orderWaitRes) throw new Error(`deposit tx not found`)
        rootStore.GetOrderApi.orderRegisterPost(registerRequest)
          .then(async (order: any) => {
            await rootStore.GetWeb3AccountBalance()
            console.log('order', order)
          })
          .catch(async (e: any) => {
            await rootStore.GetWeb3AccountBalance()
            throw new Error(e)
          })
      } else {
        swapLoading.value = false
        return ElMessage.error('Build Transaction failed')
      }
    }
    swapSuccess.value = true
    swapLoading.value = false
  } catch (error: any) {
    console.log(error)
    ElMessage.error(error?.toString())
    swapLoading.value = false
  }
}

function orderRequest(params: {
  fromChain: string
  fromTokenName: string
  address: string
  txHash: string
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const orderWaitRes = await rootStore.GetOrderApi.orderFromChainFromTokenNameAddressWaitingGet(
        params.fromChain,
        params.fromTokenName,
        params.address
      )
      const canSend = orderWaitRes.data.find((item: any) => {
        return item.txid == params.txHash && item.state == 'WAITING_REQUEST'
      })
      if (canSend) {
        resolve(true)
      } else {
        reject()
      }
    } catch (error) {
      reject()
    }
  })
}

function retryOrderRequest(
  params: {
    fromChain: string
    fromTokenName: string
    address: string
    txHash: string
  },
  retry: number
) {
  return new Promise(async (resolve, reject) => {
    function retryFun(time: number) {
      orderRequest(params)
        .then((res) => {
          return resolve(res)
        })
        .catch((err) => {
          if (time > 0) {
            setTimeout(() => {
              retryFun(--time)
            }, 3 * 1000)
          } else {
            reject()
          }
        })
    }
    retryFun(retry)
  })
}

function confrimSuccess() {
  transationDetailDialog.value = false
  sendInput.value = ''
}
</script>

<style lang="scss" src="./Swap-item.scss"></style>

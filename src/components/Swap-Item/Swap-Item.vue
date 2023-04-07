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
            :parser="(value:any) => value.replace(/^0\d{0,1}$/g,'').replace(/\D+/g,'').replace(/[0-9]{19}$/g,'').replace(/\$\s?|(,*)/g, '')"
          />
          <div class="chain-select" @click="selectCoinDialog = true">
            <div class="left">
              <IconItem :iconMap="currentCoin"></IconItem>
            </div>
            <div class="right">
              <el-icon :size="16">
                <ArrowDownBold />
              </el-icon>
            </div>
          </div>
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
          <el-input v-model="receiveInput" placeholder="0.0" />
          <div class="chain-select" @click="selectCoinDialog = true">
            <div class="left">
              <IconItem :iconMap="currentCoin"></IconItem>
            </div>
            <div class="right">
              <el-icon :size="16">
                <ArrowDownBold />
              </el-icon>
            </div>
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
import { reactive, ref, computed, toRaw } from 'vue'
import {
  MappingIcon,
  MappingChainName,
  CoinSymbol,
  NodeName,
  SdkPayType,
  CoinDecimal,
  ChainTypeBalance,
} from '@/enum'
import IconItem from '@/components/Icon-item/Icon-item.vue'
import ConvertIcon from '@/assets/images/icon_Convert.svg?url'
import Dialog from '@/components/Dialog/Dialog.vue'
import { useUserStore } from '@/store/user'
import { useRootStore } from '@/store/root'
import { ElMessage } from 'element-plus'
import { mappingChainName, GeneratorSignatrue, checkAmount } from '@/utils/util'
import Decimal from 'decimal.js-light'
import { toQuantity } from 'ethers'

import { OrderRegisterRequest } from 'mvcbridge-sdk/api'
import { SignatureHelper } from 'mvcbridge-sdk/signature'
import { GetReceiveAddress, registerOrder } from '@/api/api'
const selectChainDialog = ref(false)
const selectCoinDialog = ref(false)
const transationDetailDialog = ref(false)
const swapSuccess = ref(false)

const sendInput = ref('')
const receiveInput = computed(() => {
  return sendInput.value
})
const allowSwap = computed(() => {
  if (sendInput.value && receiveInput.value) {
    return false
  } else {
    return true
  }
})
const swapLoading = ref(false)
const rootStore = useRootStore()
const userStore = useUserStore()

const currentContractOperate = computed(() => {
  if (fromChain.value == MappingChainName.ETH) {
    if (currentAssert.value == MappingIcon.USDT) {
      return {
        contract: rootStore.GetWeb3Wallet.usdt,
        decimal: CoinDecimal.USDT,
      }
    } else {
      return {
        contract: rootStore.GetWeb3Wallet.usdc,
        decimal: CoinDecimal.USDC,
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

const recevierInfo = reactive({
  val: {
    address: '',
    chain: '',
    tokenName: '',
  },
})

const mvcTokenDecimal = computed(() => {
  return 8
})

const currentFromChain = ref(mappingChainName((window as any).ethereum.chainId))
const curretnToChain = ref(MappingChainName.MVC)
const currentAssert = ref(MappingIcon.USDT)
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
  MappingChainName.Polygon,
  MappingChainName.BNB,
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
    title: `You‘re pay in gas fees`,
    value: () => estimatedTransferInfo.val.gasFee,
    decimal: () => currentCoin.value,
  },
  {
    title: `Estimated Time of Arrival`,
    value: () => estimatedTransferInfo.val.time,
    decimal: () => 'minutes',
  },
])

const estimatedTransferInfo = reactive({
  val: {
    send: '',
    brigefee: '',
    gasFee: '',
    time: '',
    minimumReceived: '',
  },
})

const ConfrimSwapDisable = computed(() => {
  if (estimatedTransferInfo.val.gasFee) {
    return false
  } else {
    return true
  }
})

const minimumReceived = reactive({
  val: {
    title: 'Minimum Received',
    value: () => estimatedTransferInfo.val.minimumReceived,
    decimal: () => currentCoin.value,
  },
})

function resetEstimatedInfo() {
  estimatedTransferInfo.val = {
    send: '',
    brigefee: '',
    gasFee: '',
    time: '',
    minimumReceived: '',
  }
}

async function estimatedGasPrice(params: { amount: string; address: string }) {
  const value = toQuantity(
    new Decimal(params.amount).mul(10 ** currentContractOperate.value.decimal).toString()
  )
  const tx = {
    from: rootStore.GetWeb3Wallet.signer.address,
    to: params.address,
    data: currentContractOperate.value.contract.interface.encodeFunctionData('transfer', [
      params.address,
      value,
    ]),
  }
  const res = await rootStore.GetWeb3Wallet.provider.estimateGas(tx)
  if (res) {
    const eth_USD_Rate = rootStore.exchangeRate.find((item) => item.symbol === 'eth')
    return new Decimal(res.toString())
      .add(21000)
      .div(10 ** 9)
      .mul(eth_USD_Rate!.price.USD)
      .toNumber()
      .toFixed(6)
  } else {
    return '0'
  }
}

async function Swap() {
  if (userStore.user) {
    let params
    transationDetailDialog.value = true
    swapSuccess.value = false

    estimatedTransferInfo.val.send = sendInput.value
    estimatedTransferInfo.val.brigefee = new Decimal(sendInput.value)
      .mul(import.meta.env.VITE_BRIGE_FEE)
      .toString()
    recevierInfo.val = await GetReceiveAddress({
      fromChain: fromChain.value!,
      fromTokenName: currentAssert.value,
    })

    if (currentFromChain.value === MappingChainName.Ethereum) {
      console.log('sedddd', sendInput.value)
      params = {
        amount: sendInput.value,
        address: recevierInfo.val.address,
      }
      estimatedTransferInfo.val.gasFee = await estimatedGasPrice(params)
      estimatedTransferInfo.val.minimumReceived = new Decimal(sendInput.value)
        .sub(estimatedTransferInfo.val.brigefee)
        .sub(estimatedTransferInfo.val.gasFee)
        .toString()
    } else if (currentFromChain.value === MappingChainName.MVC) {
      params = {
        amount: new Decimal(sendInput.value).mul(10 ** mvcTokenDecimal.value).toString(),
        address: recevierInfo.val.address,
      }
      estimatedTransferInfo.val.gasFee = await (await estimatedTransferFtFee(params)).gasFee
      estimatedTransferInfo.val.minimumReceived = new Decimal(sendInput.value)
        .sub(estimatedTransferInfo.val.brigefee)
        .sub(estimatedTransferInfo.val.gasFee)
        .toString()
    }
  } else {
    return ElMessage.error(`Please login first`)
  }
}

async function estimatedTransferFtFee(params: { amount: string; address: string }) {
  try {
    const res = await userStore.showWallet.createBrfcChildNode(
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

    const mvcRate = rootStore.exchangeRate.find((item) => item.symbol === 'mvc')
    const { inputAmount, outputAmount } = res?.ft?.transfer?.transaction
    return {
      transation: res,
      gasFee: new Decimal(inputAmount)
        .sub(outputAmount)
        .div(10 ** mvcTokenDecimal.value)
        .mul(mvcRate!.price.USD)
        .toNumber()
        .toFixed(6),
    }
  } catch (error: any) {
    console.log('error', error.toString())
    throw new Error(error.toString())
  }
}

function triggleChain() {
  let temp = currentFromChain.value
  currentFromChain.value = curretnToChain.value
  curretnToChain.value = temp
}

async function confrimSwap() {
  try {
    if (!userStore.user) return ElMessage.error(`User unLogin,Please check login status!`)
    swapLoading.value = true

    if (fromChain.value === MappingChainName.ETH) {
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
      const tx = await currentContractOperate.value.contract
        .transfer(`${recevierInfo.val.address}`, value)
        .catch((e: any) => {
          swapLoading.value = false
          throw new Error(`Cancel Transfer`)
        })
      if (tx) {
        await tx.wait(3)
        const registerRequest: OrderRegisterRequest = {
          fromChain: fromChain.value.toLowerCase(),
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
        const message = SignatureHelper.getSigningMessageFromOrder(registerRequest)

        const sign = await rootStore.GetWeb3Wallet.signer.signMessage(message)
        if (sign) {
          registerRequest.signature = sign
          console.log('registerRequest', registerRequest)

          rootStore.GetOrderApi.orderRegisterPost(registerRequest)
            .then((order: any) => {
              console.log('order', order)
            })
            .catch((e: any) => {
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
        currency: estimatedTransferInfo.val.gasFee,
        token: {
          symbol: currentCoin.value!,
          amount: sendInput.value,
        },
      }).catch((e) => {
        throw new Error(e)
      })

      const tx = await userStore.showWallet
        .createBrfcChildNode(
          {
            nodeName: NodeName.FtTransfer,
            data: JSON.stringify({
              receivers: [
                {
                  address: recevierInfo.val.address,
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
          throw new Error(e.toString())
        })

      console.log('tx12312', tx)

      if (tx?.ft?.transfer?.txId) {
        const registerRequest = GeneratorSignatrue({
          fromChain: fromChain.value.toLowerCase(),
          fromTokenName: currentCoin.value!.toLowerCase(),
          txid: tx?.ft?.transfer?.txId,
          amount: new Decimal(sendInput.value).mul(10 ** mvcTokenDecimal.value).toString(),
          fromAddress: userStore.user!.address,
          toChain: curretnToChain.value.toLowerCase(),
          toTokenName: currentCoin.value!.toLowerCase(),
          toAddress: rootStore.GetWeb3Wallet.signer.address,
        })
        console.log('registerRequest', registerRequest)

        rootStore.GetOrderApi.orderRegisterPost(registerRequest)
          .then((order: any) => {
            console.log('order', order)
          })
          .catch((e: any) => {
            throw new Error(e)
          })
        // await registerOrder()
      } else {
        swapLoading.value = false
        return ElMessage.error('Build Transaction failed')
      }
    }
    swapSuccess.value = true
    swapLoading.value = false
  } catch (error: any) {
    ElMessage.error(error.toString())
    swapLoading.value = false
  }
}

function confrimSuccess() {
  transationDetailDialog.value = false
}
</script>

<style lang="scss" src="./Swap-item.scss"></style>

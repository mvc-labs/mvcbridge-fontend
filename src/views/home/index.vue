<template>
  <div class="header-wrap">
    <header class="flex flex-align-center">
      <div class="logo">
        <img :src="Logo" alt="" />
      </div>
      <div class="menu">
        <div class="wallet" @click="checkWalletInfo">
          <el-icon><Wallet /></el-icon>
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
  <div class="swap-warp">
    <div class="swap-container"><SwapItem></SwapItem></div>
  </div>

  <div class="foot">
    <footer class="flex flex-align-center">
      <div class="logo">
        <img :src="Logo" alt="" />
      </div>
      <div class="contract-us">
        <img v-for="item in contractList" :src="item" alt="" />
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
            <span class="address">{{
              item.chain == ChainOrigin.MVC
                ? $filters.spiltAddress(userStore.user!.address!)
                : $filters.spiltAddress(userStore.user!.evmAddress!)
            }}</span>
          </div>
          <div class="list" v-for="coin in item.coinList">
            <IconItem :iconMap="coin.chainName"></IconItem>
            <div class="right">
              <div class="item">
                <span class="symbol" v-loading="coin.loading" element-loading-background="#232531"
                  >{{ coin.balance }} {{ coin.chainSymbol }}</span
                >
                <span class="priceRate">USD</span>
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
                currentTransferType == MappingIcon.MVC
                  ? 'Enter Transfer Address/MetaName'
                  : 'Enter Transfer Address/ENS'
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
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, toRaw, watch } from 'vue'
import SwapItem from '@/components/Swap-Item/Swap-Item.vue'
import mvc from '@/assets/images/mvc.svg?url'
import twitter from '@/assets/images/twitter.svg?url'
import reddit from '@/assets/images/reddit.svg?url'
import instagram from '@/assets/images/instagram.svg?url'
import discord from '@/assets/images/discord.svg?url'
import { Wallet, ArrowLeftBold } from '@element-plus/icons-vue'
import Logo from '@/assets/images/logo_mvc.svg?url'
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
import { formatUnits, toQuantity, verifyMessage, resolveAddress } from 'ethers'
import { useRootStore } from '@/store/root'
import { useUserStore } from '@/store/user'
import {
  checkUserLogin,
  mappingChain,
  mappingCoin,
  mappingChainOrigin,
  getAccountUserInfo,
  ensConvertAddress,
} from '@/utils/util'
import Decimal from 'decimal.js-light'
const contractList: string[] = [mvc, twitter, instagram, reddit, discord]
const DrawerOperate = ref(false)
const innerDrawer = ref(false)
const formSize = ref('default')
const transferLoading = ref(false)
const ruleFormRef = ref<FormInstance>()
const rootStore = useRootStore()
const userStore = useUserStore()
const currentTransferType = ref()
const currentCoinUit = ref(CoinUint.Space)
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
})

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
            case MappingIcon.MUSDC:
              coin.balance = rootStore.mvcWalletTokenBalance.usdc
              break
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

const handleCommand = (command: string | number | object) => {
  if (command == 'logout') {
    userStore.logout()
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

function transferSpace() {
  return new Promise(async (resolve, reject) => {
    const value =
      currentCoinUit.value == CoinUint.Space
        ? new Decimal(ruleForm.amount).mul(Math.pow(10, 8)).toNumber()
        : new Decimal(ruleForm.amount).toNumber()
    const res = await userStore.showWallet
      .createBrfcChildNode(
        {
          nodeName: NodeName.SendMoney,
          payTo: [
            {
              amount: value,
              address: userInfo.val!.address,
            },
          ],
        },
        {
          payType: SdkPayType.SPACE,
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

const TransferConfrim = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  let toAddress
  try {
    await formEl.validate(async (valid, fields) => {
      transferLoading.value = true
      if (valid) {
        let res
        if (currentTransferType.value == MappingIcon.MVC) {
          const target = await getAccountUserInfo(ruleForm.address).catch((e: any) => {
            transferLoading.value = false
            ElMessage.error(e.message)
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
        } else {
          const decimal = currentTransferType.value == MappingIcon.Tether ? 6 : 18
          toAddress = await ensConvertAddress(ruleForm.address.trim()).catch((e) => {
            return ElMessage.error(e.toString())
          })
          const value = toQuantity(new Decimal(ruleForm.amount).mul(10 ** decimal).toString())
          res = await rootStore.GetWeb3Wallet.usdt.transfer(toAddress, value).catch((e: any) => {
            transferLoading.value = false
            return ElMessage.error(`Transfer cancel!`)
          })
          await res.wait()
        }
        console.log('submit!', res)
        ElMessage.success(`Transfer success!`)
        transferLoading.value = false
        innerDrawer.value = false
      } else {
        transferLoading.value = false
        console.log('submit!')
      }
    })
  } catch (error) {
    transferLoading.value = false
  }
}
const walletList: WalletInfo[] = reactive([
  {
    chain: mappingChainOrigin((window as any).ethereum.chainId),
    coinList: [
      {
        chainName: mappingChain((window as any).ethereum.chainId),
        chainSymbol: mappingCoin((window as any).ethereum.chainId),
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
        chainSymbol: CoinSymbol.USDT,
        loading: true,
        balance: '0',
      },
      {
        chainName: MappingIcon.MUSDC,
        chainSymbol: CoinSymbol.USDC,
        loading: true,
        balance: '0',
      },
    ],
  },
])

async function ConnectWallet() {
  await checkUserLogin()
}
</script>

<style lang="scss" src="./index.scss"></style>

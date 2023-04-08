<template>
  <!-- 连接钱包 -->
  <ElDialog
    :model-value="rootStore.isShowLogin"
    :close-on-click-modal="false"
    :show-close="!loading"
    title="Connect Your Wallet"
    class="connectDialog"
    @close="rootStore.$patch({ isShowLogin: false })"
  >
    <div class="login-warp flex">
      <a
        class="close flex flex-align-center flex-pack-center"
        @click="rootStore.$patch({ isShowLogin: false })"
      >
        <el-icon><Close /></el-icon>
      </a>
      <div class="flex1">
        <!-- 选择钱包 -->
        <div class="connect-wallet flex flex-v" v-if="status === ConnectWalletStatus.Watting">
          <div class="connect-wallet-section" v-for="(item, index) in wallets" :key="index">
            <!-- <div class="title">{{ item.title() }}</div> -->
            <div class="btn-list flex flex-v">
              <div
                class="flex flex-align-center main-border"
                :class="[wallet.disable ? 'gray' : '']"
                @click="wallet.fun()"
                v-for="(wallet, walletIndex) in item.list"
                :key="walletIndex"
              >
                <div class="left">
                  <img class="icon" :src="wallet.icon" />
                  {{ wallet.name() }}
                  <span class="desc">{{ wallet.desc() }}</span>
                </div>
                <div class="right">
                  <el-icon><ArrowRight /></el-icon>
                </div>
              </div>
            </div>
          </div>
          <div class="terms">
            <span>By connecting, I accept</span>
            <a href="#">Terms of Use</a>
          </div>
        </div>
      </div>
    </div>
  </ElDialog>

  <!-- MetaMask -->
  <MetaMask
    v-model="rootStore.isShowMetaMak"
    ref="MetaMaskRef"
    id="metamask"
    @success="onThreePartLinkSuccess"
  />

  <!-- 绑定metaId -->
  <BindMetaIdVue
    :thirdPartyWallet="thirdPartyWallet"
    ref="BindMetaIdRef"
    v-model="isShowBindModal"
    @finish="rootStore.$patch({ isShowLogin: false })"
  />
</template>

<script setup lang="ts">
import { reactive, ref, Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, Close } from '@element-plus/icons-vue'
import { LoginByEthAddress } from '@/api/core'
import { BindStatus, NodeName, WalletOrigin, RegisterSource } from '@/enum'
import { useRootStore } from '@/store/root'
import { decode, encode } from 'js-base64'
// @ts-ignore
import { MD5 } from 'crypto-es/lib/md5.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import WalletConnect from '@walletconnect/client'
import QRCodeModal from '@walletconnect/qrcode-modal'
import { currentSupportChain } from '@/config'
import IconMetaMask from '@/assets/images/MetaMask_Fox.svg.svg?url'
import IconWallteConnect from '@/assets/images/login_logo_wallteconnect.png'
import IconMetalet from '@/assets/images/MVC.png?url'
import { ethers, sha256, toUtf8Bytes, toUtf8String, toQuantity } from 'ethers'
import BindMetaIdVue from './BindMetaId.vue'
import MetaMask from '@/components/MetaMask/MetaMask.vue'
const enum ConnectWalletStatus {
  Watting,
  WallteConnect,
}
const rootStore = useRootStore()
const isShowBindModal = ref(false)
const MetaMaskRef = ref()
const loading = ref(false)
const thirdPartyWallet = reactive({
  signAddressHash: '',
  address: '',
  chainId: '',
})
const BindMetaIdRef = ref()
const i18n = useI18n()

const status: Ref<ConnectWalletStatus> = ref(ConnectWalletStatus.Watting)
const wallets = [
  {
    title: () => {
      return i18n.t('Connect Your Wallet')
    },
    list: [
      {
        name: () => {
          return 'MetaMask'
        },
        desc: () => {
          return ``
        },
        icon: IconMetaMask,
        fun: () => {
          rootStore.$patch({ isShowLogin: false, isShowMetaMak: true })
        },
      },
      // {
      //   name: () => {
      //     return 'WallteConnect'
      //   },
      //   desc: () => {
      //     return ``
      //   },
      //   icon: IconWallteConnect,
      //   fun: connectWalletConnect,
      // },
      {
        name: () => {
          return 'Metalet'
        },
        desc: () => {
          return ``
        },
        disable: true,
        icon: IconMetalet,
        fun: () => {
          ElMessage.warning(`Coming soon`)
        },
      },
    ],
  },
]

async function onThreePartLinkSuccess(params: {
  signAddressHash: string
  address: string
  walletOrigin?: string
}) {
  //检查hash是否已绑定

  const getMnemonicRes = await LoginByEthAddress({
    evmAddress: params.address,
    chainId: (window as any).ethereum?.chainId,
  }).catch((error) => {
    if (error.code === -1) {
      // 还没绑定
      thirdPartyWallet.signAddressHash = params.signAddressHash
      thirdPartyWallet.address = params.address.toLocaleLowerCase()
      thirdPartyWallet.chainId = (window as any).ethereum?.chainId
      BindMetaIdRef.value.status = BindStatus.ChooseType
      rootStore.$patch({ isShowMetaMak: false })
      isShowBindModal.value = true
    } else {
      throw new Error(error.message)
    }
  })

  let res: BindMetaIdRes
  if (getMnemonicRes?.code === 0) {
    //这里需要再判断一下用户注册来源，如果是metamask注册的用户要拿metaid来解

    if (
      getMnemonicRes?.data?.metaId &&
      getMnemonicRes?.data?.registerSource === RegisterSource.metamask
    ) {
      //这里需要再判断一下用户注册来源，如果是metamask注册的用户要拿metaid来解

      try {
        res = await BindMetaIdRef.value.loginByMnemonic(
          getMnemonicRes.data.evmEnMnemonic,
          MD5(params.signAddressHash).toString(),
          false,
          getMnemonicRes.data.path
        )

        if (res) {
          await BindMetaIdRef.value.loginSuccess(res)
          rootStore.$patch({ isShowMetaMak: false })
          rootStore.$patch({ isShowLogin: false })
        }
      } catch (error) {
        if (getMnemonicRes?.data?.registerTime < +Date.now()) {
          ElMessageBox.confirm(`${i18n.t('allowUpdate')}`, `${i18n.t('updateRemind')}`, {
            customClass: 'primary',
            confirmButtonText: `${i18n.t('confirmUpdate')}`,
            cancelButtonText: i18n.t('Cancel'),
          }).then(() => {
            //把准备要升级的hash保存起来
            rootStore.updateAccountPlan({
              registerTime: getMnemonicRes?.data?.registerTime,
              signHash: params.signAddressHash,
            })
            if (params.walletOrigin == WalletOrigin.WalletConnect) {
              connectWalletConnect(true)
            } else {
              rootStore.updateShowLoginBindEvmAccount({
                isUpdatePlan: true,
                loginedButBind: false,
                bindEvmChain: '',
              })
              MetaMaskRef.value.MetaMaskConnect()
            }
            rootStore.$patch({ isShowMetaMak: false })
          })
        } else {
          rootStore.$patch({ isShowMetaMak: false })
          return ElMessage.error(`${i18n.t('walletError')}`)
        }
      }

      // return  emit('update:modelValue', false)
    } else if (
      getMnemonicRes.data.evmEnMnemonic &&
      getMnemonicRes?.data?.registerSource == RegisterSource.showmoney
    ) {
      // 有密码直接登录， 没有密码就要用户输入
      const password = localStorage.getItem(encode('password'))
      if (password) {
        res = await BindMetaIdRef.value.loginByMnemonic(
          getMnemonicRes.data.menmonic,
          decode(password),
          false,
          getMnemonicRes.data.path
        )

        if (res) {
          await BindMetaIdRef.value.loginSuccess(res)
          rootStore.$patch({ isShowLogin: false })
        }
      } else {
        try {
          res = await BindMetaIdRef.value.loginByMnemonic(
            getMnemonicRes.data.evmEnMnemonic,
            MD5(params.signAddressHash).toString(),
            false,
            getMnemonicRes.data.path
          )
          if (res) {
            await BindMetaIdRef.value.loginSuccess(res)
            rootStore.$patch({ isShowMetaMak: false })
            rootStore.$patch({ isShowLogin: false })
          }
        } catch (error) {
          if (getMnemonicRes?.data?.registerTime < +Date.now()) {
            ElMessageBox.confirm(`${i18n.t('allowUpdate')}`, `${i18n.t('updateRemind')}`, {
              customClass: 'primary',
              confirmButtonText: `${i18n.t('confirmUpdate')}`,
              cancelButtonText: i18n.t('Cancel'),
            }).then(() => {
              //把准备要升级的hash保存起来
              rootStore.updateAccountPlan({
                registerTime: getMnemonicRes?.data?.registerTime,
                signHash: params.signAddressHash,
              })
              if (params.walletOrigin == WalletOrigin.WalletConnect) {
                connectWalletConnect(true)
              } else {
                MetaMaskRef.value.MetaMaskConnect(true)
              }

              rootStore.$patch({ isShowMetaMak: false })
            })
          } else {
            rootStore.$patch({ isShowMetaMak: false })
            return ElMessage.error(`${i18n.t('walletError')}`)
          }
        }
      }
    } else if (
      !getMnemonicRes?.data.metaId &&
      getMnemonicRes?.data?.registerSource === RegisterSource.metamask
    ) {
      rootStore.$patch({ isShowMetaMak: false })
      // 修复有问题的账号 待完善
      return ElMessage.error(`${i18n.t('MetaidIsNull')}`)
    }
  }
}

async function connectWalletConnect(isUpdate: boolean = false) {
  const connector = new WalletConnect({
    bridge: 'https://bridge.walletconnect.org', // Required
    qrcodeModal: QRCodeModal,
    clientMeta: {
      description: 'My website description ',
      url: 'https://mywebsite.url',
      icons: ['../assets/svg/icon.svg'],
      name: import.meta.env.VITE_App_Key,
    },
  })

  connector.on('session_update', async (error, payload) => {
    if (error) {
      throw error
    }
    const { accounts, chainId } = payload.params[0]
  })

  connector.on('disconnect', (error, payload) => {
    if (error) {
      throw error
    }

    // Delete connector
  })
  ;(window as any).WallectConnect = connector
  const { accounts, chainId } = await connector.connect()
  let res, address, message
  const hexChainId = `0x${chainId.toString(16)}`

  if (!rootStore.chainWhiteList.includes(hexChainId)) {
    ElMessageBox.confirm(
      i18n.t('MetaMak.Chain Network Error Tips') + `${import.meta.env.VITE_ETH_CHAIN}`,
      i18n.t('MetaMak.Chain Network Error'),
      {
        customClass: 'primary',
        confirmButtonText: i18n.t('MetaMak.Change') + `${import.meta.env.VITE_ETH_CHAIN}`,
        cancelButtonText: i18n.t('Cancel'),
      }
    )
      .then(async () => {
        connector
          .sendCustomRequest({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId:
                  import.meta.env.VITE_DEFAULT_NETWORK == 'eth'
                    ? currentSupportChain[0].chainId
                    : currentSupportChain[1].chainId,
              },
            ],
          })
          .then(async () => {
            address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
            message = isUpdate
              ? import.meta.env.MODE == 'gray'
                ? `0x${sha256(toUtf8Bytes(accounts[0])).split('0x')[1]}`
                : `${sha256(toUtf8Bytes(accounts[0])).slice(2, -1)}`
              : `${toQuantity(toUtf8Bytes(sha256(toUtf8Bytes(accounts[0].toLocaleLowerCase()))))}`
            if (rootStore.updatePlanWhiteList.includes(accounts[0])) {
              address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
              message = isUpdate
                ? `${sha256(toUtf8Bytes(accounts[0])).slice(2, -1)}`
                : `${toQuantity(toUtf8Bytes(sha256(toUtf8Bytes(accounts[0].toLocaleLowerCase()))))}`
            }

            res = await connector.signPersonalMessage([
              isUpdate ? message : address,
              isUpdate ? address : message,
            ])

            if (res) {
              rootStore.$patch({ isShowLogin: false })
              await onThreePartLinkSuccess({
                signAddressHash: res,
                address: address,
                walletOrigin: WalletOrigin.WalletConnect,
              })
            }
          })
          .catch((error: any) => {
            return ElMessage.error(error.message)
          })
      })
      .catch((error: any) => {
        return ElMessage.error(error.message)
      })
  } else {
    try {
      //toQuantity
      address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
      message = isUpdate
        ? import.meta.env.MODE == 'gray'
          ? `0x${sha256(toUtf8Bytes(accounts[0])).split('0x')[1]}`
          : `${sha256(toUtf8Bytes(accounts[0])).slice(2, -1)}`
        : `${toQuantity(toUtf8Bytes(sha256(toUtf8Bytes(accounts[0].toLocaleLowerCase()))))}`
      if (rootStore.updatePlanWhiteList.includes(accounts[0])) {
        address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
        message = isUpdate
          ? `${sha256(toUtf8Bytes(accounts[0])).slice(2, -1)}`
          : `${toQuantity(toUtf8Bytes(sha256(toUtf8Bytes(accounts[0].toLocaleLowerCase()))))}`
      }

      res = await connector.signPersonalMessage([
        isUpdate ? message : address,
        isUpdate ? address : message,
      ])

      if (res) {
        rootStore.$patch({ isShowLogin: false })
        await onThreePartLinkSuccess({
          signAddressHash: res,
          address: address,
          walletOrigin: WalletOrigin.WalletConnect,
        })
      }
    } catch (error) {
      console.log(i18n.t(`sign fail`))
    }
  }

  connector.killSession()
}
</script>

<style lang="scss" src="./ConnectWalletModal.scss"></style>

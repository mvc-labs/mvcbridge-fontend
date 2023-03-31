<template>
  <ElDialog :model-value="modelValue" class="none-header sm" :close-on-click-modal="false">
    <div class="bind-metaid" v-loading="loading" :element-loading-text="$t('Loading')">
      <!-- 选择绑定类型 -->
      <div class="choose" v-if="status === BindStatus.ChooseType">
        <div class="title">{{ $t('Login.bindMetaId.title1') }}</div>
        <div class="cont">
          <div class="sub-title">{{ $t('Login.bindMetaId.title2') }}</div>
          <div class="list">
            <div
              class="main-border flex flex-align-center"
              v-for="(item, index) in operates"
              :key="index"
              @click="selectLoginType(item.value)"
            >
              <div class="icon-warp flex flex-align-center flex-pack-center">
                <img :src="walletIcon" alt="" />
              </div>
              <div class="name">{{ item.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 绑定成功 -->
      <div class="choose" v-else-if="status === BindStatus.BindSuccess">
        <div class="title">{{ $t('Login.bindMetaId.bindSuccessTitle') }}</div>
        <div class="cont">
          <div class="userInfo">
            <UserAvatar
              :meta-id="userStore.user!.metaId"
              :image="userStore.user!.avatarImage"
              :name="userStore.user!.name"
              :meta-name="userStore.user!.metaName"
            />
            <div class="username">{{ userStore.user?.name }}</div>
            <div class="metaid">
              MetaID：{{ userStore.user!.metaId.slice(0, 7) }}...{{
                userStore.user!.metaId.slice(-7)
              }}
            </div>

            <div class="operate flex flex-pack-end">
              <a class="main-border primary" @click="skip">
                <el-icon :size="20"><Right /></el-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
      <!-- 绑定 MetaID信息 -->
      <div class="bind-haved-metaid" v-else-if="status !== BindStatus.BindRegisterMetaId">
        <div class="title">
          {{
            status === BindStatus.BindHavedMetaId
              ? $t('Login.bindMetaId.Link to My MetaID')
              : $t('Login.bindMetaId.bindRegisterMetaId')
          }}
        </div>
        <div class="intro">{{ $t('Login.bindMetaId.bindHavedMetaIdIntro') }}</div>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="0" class="dialog-form">
          <!-- 用户名 -->

          <!-- MetaId -->
          <el-form-item prop="account" v-if="status === BindStatus.BindHavedMetaId">
            <el-input :placeholder="$t('Enter MetaID For Bind')" v-model="form.account"></el-input>
          </el-form-item>

          <!-- 密码 -->
          <el-form-item prop="pass">
            <el-input
              :placeholder="$t('Enter ShowMoney Password')"
              type="password"
              v-model="form.pass"
              autocomplete="off"
            >
            </el-input>
          </el-form-item>
        </el-form>

        <div class="operate flex flex-align-center">
          <div class="flex1">
            <a @click="back">{{ $t('back') }}</a>
          </div>
          <div class="main-border primary" :class="{ faded: isBtnDisabled }" @click="submitForm">
            <el-icon :size="20"><Right /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { GetUserInfo, GetBindMetaidAddressList } from '@/api/aggregation'
import type { MetaMaskLoginUserInfo } from '@/@types/metamask'
import {
  GetMetaIdByLoginName,
  GetRandomWord,
  LoginByNewUser,
  GetWordBeforeReg,
  MnemoicLogin,
  setHashData,
  evmLoginAccountUpdate,
} from '@/api/core'
import { BindStatus, NodeName, CurrentSupportChain } from '@/enum'
import { useUserStore } from '@/store/user'
import { useRootStore } from '@/store/root'
import {
  createMnemonic,
  decryptMnemonic,
  encryptMnemonic,
  HdWallet,
  hdWalletFromMnemonic,
  signature,
} from '@/utils/wallet/hd-wallet'
import { encode, decode } from 'js-base64'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { openLoading } from '@/utils/util'
import { ethBindingData } from '@/config'
// @ts-ignore
import { MD5 } from 'crypto-es/lib/md5.js'
import { ElMessage } from 'element-plus'
import { SDK } from '@/utils/sdk'
import { Right } from '@element-plus/icons-vue'
import walletIcon from '@/assets/images/wallet.svg?url'
import walletAddIcon from '@/assets/images/wallet_add.svg?url'
interface Props {
  modelValue: boolean
  thirdPartyWallet: {
    signAddressHash: string
    address: string
    chainId: string
  }
}
const props = withDefaults(defineProps<Props>(), {})
const ethereum = (window as any).ethereum
const i18n = useI18n()
const userStore = useUserStore()
const rootStore = useRootStore()
const status = ref(BindStatus.ChooseType)
const emit = defineEmits(['update:modelValue', 'register', 'finish'])
const loading = ref(false)
const operates = reactive([
  {
    name: i18n.t('Login.bindMetaId.createMetaId'),
    icon: walletAddIcon,
    value: BindStatus.BindRegisterMetaId,
  },
  {
    name: i18n.t('Login.bindMetaId.bindHavedMetaId'),
    icon: walletIcon,
    value: BindStatus.BindHavedMetaId,
  },
])
const form = reactive({
  name: '',
  pass: '',
  checkPass: '',
  account: '',
  MetaidOrAdress: '',
})
const isBtnDisabled = computed(() => {
  let result = true
  if (status.value === BindStatus.BindHavedMetaId) {
    if (form.account !== '' && form.pass !== '') {
      result = false
    }
  } else if (status.value === BindStatus.BindRegisterMetaId) {
    if (form.pass !== '' && form.checkPass !== '' && form.pass === form.checkPass) {
      result = false
    }
  }
  return result
})
const rules = {
  account: [
    {
      required: true,
      message: `Please enter an existing MetaId or address for binding`,
      trigger: 'blur',
    },
  ],
  pass: [
    {
      required: true,
      validator: (rule: any, value: any, callback: any) => {
        if (value === '') {
          callback(new Error(`please enter password`))
        } else {
          if (form.checkPass !== '') {
            formRef.value.validateField('checkPass')
          }
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  checkPass: [
    {
      required: true,
      validator: (rule: any, value: any, callback: any) => {
        if (value === '') {
          callback(new Error('please enter password again'))
        } else if (value !== form.pass) {
          callback(new Error('The passwords entered twice are inconsistent!'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}
const formRef = ref()
async function selectLoginType(item: number) {
  status.value = item
  let loading
  if (item == BindStatus.BindRegisterMetaId) {
    try {
      emit('update:modelValue', false)
      loading = openLoading({
        text: i18n.t('registing'),
      })
      const res = await createMetaidAccount()

      await loginSuccess(res)
      loading.close()
    } catch (error) {
      ;(loading as any).close()
    }
  }
}

function skip() {
  emit('finish')
  emit('update:modelValue', false)
}

function back() {
  formRef.value.resetFields()
  status.value = BindStatus.ChooseType
}
function submitForm() {
  formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      let res: BindMetaIdRes
      try {
        if (status.value == BindStatus.BindHavedMetaId) {
          //绑定metaid用户

          res = await bindingMetaidOrAddressLogin()
          res.password = MD5(props.thirdPartyWallet.signAddressHash).toString()
        } else if (status.value === BindStatus.BindSuccess) {
          emit('update:modelValue', false)
        }
        if (res!) {
          await loginSuccess(res)
        }
      } catch (error) {
        loading.value = false
        ElMessage.error(
          `${
            (error as any).message
          },Please check whether the account password is entered correctly or go to https://www.visionmoney.space register`
        )
      }
    }
  })
}

function loginSuccess(params: BindMetaIdRes) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const metaIdInfo = await GetUserInfo(params.userInfo.metaId)

      if (!params.userInfo.evmAddress) {
        params.userInfo.evmAddress = params.userInfo.ethAddress
      }

      //更新用户信息前先升级账户,store签名不等于当前登录账户签名时需要升级
      if (
        rootStore.updatePlanRes?.signHash &&
        MD5(rootStore.updatePlanRes!.signHash).toString() != decode(params.password)
      ) {
        const updateSuccess = await updatePlan(params.userInfo, params.password)

        if (updateSuccess) {
          params.userInfo.enCryptedMnemonic = updateSuccess.evmEnMnemonic
          // params.userInfo.evmEnMnemonic = updateSuccess.evmEnMnemonic
          params.password = updateSuccess.newPw
          ElMessage.success(`${i18n.t('updateSuccess')}`)
        }
      }

      userStore.updateUserInfo({
        ...metaIdInfo.data,
        ...params.userInfo,
        password: params.password,
        loginType: 'MetaMask',
      })

      userStore.$patch({
        wallet: new SDK(import.meta.env.VITE_NET_WORK),
      })

      await userStore.showWallet.initWallet()

      formRef?.value?.resetFields()
      if (status.value === BindStatus.BindHavedMetaId) {
        status.value = BindStatus.BindSuccess
      } else {
        emit('update:modelValue', false)
        if (status.value === BindStatus.BindRegisterMetaId) {
          emit('register')
          status.value = 0
        }
      }
      loading.value = false
      resolve()
    } catch (error) {
      loading.value = false
      emit('update:modelValue', false)
      reject(error)
    }
  })
}

async function updatePlan(params: MetaMaskLoginUserInfo, pw: string) {
  const Mnemonic = decryptMnemonic(params.enCryptedMnemonic, pw)

  const evmEnMnemonic = encryptMnemonic(Mnemonic, MD5(rootStore.updatePlanRes!.signHash).toString())
  try {
    const result = await evmLoginAccountUpdate({
      accessKey: params.token,
      userName: params.userType == 'email' ? params.email : params.phone,
      timestamp: +Date.now(),
      metaId: params.metaId,
      address: params.address,
      evmAddress: params.evmAddress!,
      evmEnMnemonic: evmEnMnemonic,
      chainId: (window as any).ethereum.chainId,
    })
    if (result.code == 0) {
      return {
        evmEnMnemonic,
        newPw: MD5(rootStore.updatePlanRes!.signHash).toString(),
      }
    } else {
      throw new Error(`${i18n.t('updateFail')}`)
    }
  } catch (error) {
    throw new Error(`${i18n.t('updateFail')}`)
  }
}

function createMetaidAccount() {
  return new Promise<BindMetaIdRes>(async (resolve, reject) => {
    try {
      const mnemonic = await createMnemonic(props.thirdPartyWallet.signAddressHash)

      const hdWallet = await hdWalletFromMnemonic(
        mnemonic,
        'new',
        import.meta.env.VITE_NET_WORK,
        import.meta.env.VITE_WALLET_PATH
      )

      const HdWalletInstance = new HdWallet(hdWallet)

      const account: any = {
        name: `${import.meta.env.VITE_DefaultName}`,
      }
      const address = hdWallet.deriveChild(0).deriveChild(0).privateKey.toAddress().toString()
      //
      const pubKey = hdWallet.deriveChild(0).deriveChild(0).publicKey.toString()

      // const metaId = await HdWalletInstance.onlyCreateMetaidNode()
      console.log('props.thirdPartyWallet', props.thirdPartyWallet)
      console.log('hdWallet', HdWalletInstance)

      if ((window as any).WallectConnect) {
        // WallectConnect
        const encryptmnemonic = encryptMnemonic(
          mnemonic,
          MD5(props.thirdPartyWallet.signAddressHash).toString()
        )
        const {
          data: { word },
        } = await GetWordBeforeReg({
          evmAddress: props.thirdPartyWallet.address || (window as any).ethereum.selectedAddress,
          chainId: (window as any).ethereum?.chainId,
        }).catch((e) => {
          throw new Error(e.toString())
        })

        const getUserInfoRes = await LoginByNewUser({
          word: word,
          address: address,
          xpub: hdWallet.xpubkey,
          pubKey: pubKey,
          evmEnMnemonic: encryptmnemonic,
          evmAddress: props.thirdPartyWallet.address || (window as any).ethereum.selectedAddress,
          chainId: (window as any).ethereum?.chainId,
          userName: account.name,
          path: parseInt(import.meta.env.VITE_WALLET_PATH),
        })

        // @ts-ignore
        if (getUserInfoRes.code == 0) {
          ;(account.accessKey = getUserInfoRes.data.token),
            (account.userName =
              getUserInfoRes.data.registerType === 'email'
                ? getUserInfoRes.data.email
                : getUserInfoRes.data.phone)

          const { metaId } = await HdWalletInstance.initMetaIdNode({
            ...account,
            userType: getUserInfoRes.data.registerType,
            email: getUserInfoRes.data.email,
            phone: getUserInfoRes.data.phone,
            ethAddress: props.thirdPartyWallet.address
              ? props.thirdPartyWallet.address
              : ethereum.selectedAddress,
          })
          const newUserInfo = Object.assign(getUserInfoRes.data, {
            metaId: metaId,
            evmAddress: props.thirdPartyWallet.address
              ? props.thirdPartyWallet.address
              : ethereum.selectedAddress,
            enCryptedMnemonic: encryptmnemonic,
            chainId: ethereum?.chainId,
            path: parseInt(import.meta.env.VITE_WALLET_PATH),
          })

          await sendHash(newUserInfo)

          resolve({
            userInfo: newUserInfo,
            wallet: hdWallet,
            password: form.pass
              ? form.pass
              : MD5(props.thirdPartyWallet.signAddressHash).toString(),
            // password: form.pass,
          })
        }
      } else {
        // MetaMask
        const encryptmnemonic = encryptMnemonic(
          mnemonic,
          MD5(props.thirdPartyWallet.signAddressHash).toString()
        )

        const {
          data: { word },
        } = await GetWordBeforeReg({
          evmAddress: props.thirdPartyWallet.address || (window as any).ethereum.selectedAddress,
          chainId: (window as any).ethereum?.chainId,
        }).catch((e) => {
          throw new Error(e.toString())
        })

        const getUserInfoRes = await LoginByNewUser({
          word: word,
          address: address,
          xpub: hdWallet.xpubkey,
          pubKey: pubKey,
          evmEnMnemonic: encryptmnemonic,
          evmAddress: props.thirdPartyWallet.address || (window as any).ethereum.selectedAddress,
          chainId: (window as any).ethereum?.chainId,
          userName: account.name,
          path: parseInt(import.meta.env.VITE_WALLET_PATH),
        })

        // @ts-ignore
        if (getUserInfoRes.code == 0) {
          ;(account.accessKey = getUserInfoRes.data.token),
            (account.userName =
              getUserInfoRes.data.registerType === 'email'
                ? getUserInfoRes.data.email
                : getUserInfoRes.data.phone)

          const { metaId } = await HdWalletInstance.initMetaIdNode({
            ...account,
            userType: getUserInfoRes.data.registerType,
            email: getUserInfoRes.data.email,
            phone: getUserInfoRes.data.phone,
            ethAddress: props.thirdPartyWallet.address
              ? props.thirdPartyWallet.address
              : ethereum.selectedAddress,
          })
          const newUserInfo = Object.assign(getUserInfoRes.data, {
            metaId: metaId,
            ethAddress: props.thirdPartyWallet.address
              ? props.thirdPartyWallet.address
              : ethereum.selectedAddress,
            enCryptedMnemonic: encryptmnemonic,
            chainId: ethereum?.chainId,
            path: parseInt(import.meta.env.VITE_WALLET_PATH),
          })
          await sendHash(newUserInfo)
          resolve({
            userInfo: newUserInfo,
            wallet: hdWallet,
            password: form.pass
              ? form.pass
              : MD5(props.thirdPartyWallet.signAddressHash).toString(),
            // password: form.pass,
          })
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}

function currentChain() {
  if (ethereum?.chainId == '0x1' || ethereum?.chainId == '0x5' || ethereum?.chainId == '0xaa36a7') {
    return 'eth'
  } else if (ethereum?.chainId == '0x13881' || ethereum?.chainId == '0x89') {
    return 'polygon'
  }
}

//创建 eht 绑定的brfc 节点
function createETHBindingBrfcNode(MetaidRes: BindMetaIdRes) {
  const { wallet, userInfo } = MetaidRes

  return new Promise<void>(async (resolve, reject) => {
    try {
      const hdWallet = new HdWallet(wallet)
      // 1. 先获取utxo
      let utxos = await hdWallet.provider.getUtxos(hdWallet.wallet.xpubkey.toString())
      if (!utxos.length) {
        const initUtxo = await hdWallet.provider
          .getInitAmount({
            address: hdWallet.rootAddress,
            xpub: hdWallet.wallet.xpubkey.toString(),
            token: userInfo.token || '',
            userName: userInfo.userType === 'phone' ? userInfo.phone : userInfo.email,
          })
          .catch((error) => {
            console.log(error)
          })
        if (initUtxo) {
          utxos = [initUtxo]
        }
      }

      if (utxos.length) {
        // 2. 把钱打到protocols节点
        // 先把钱打回到 protocolAddress
        const transfer = await hdWallet.makeTx({
          utxos: utxos,
          opReturn: [],
          change: hdWallet.rootAddress,
          payTo: [
            {
              amount: 2000,
              address: hdWallet
                ?.getPathPrivateKey(hdWallet.keyPathMap.Info.keyPath)
                .publicKey.toAddress(hdWallet.network)
                .toString(),
            },
          ],
        })
        if (transfer) {
          const utxo = await hdWallet.utxoFromTx({
            tx: transfer,
            addressInfo: {
              addressType: 0,
              addressIndex: 1,
            },
            outPutIndex: 0,
          })
          if (utxo) {
            utxos = [utxo]
          }
          // 创建 eht 绑定的brfc 节点

          const res = await GetUserInfo(userInfo.metaId)
          let ethBindingData: Partial<ethBindingData> = {}
          const bingdMetaidTypes = await GetBindMetaidAddressList(userInfo.metaId)
          ethBindingData.evmAddress = props.thirdPartyWallet.address.toLocaleLowerCase()
          // if (currentChain() == CurrentSupportChain.Eth) {
          //   ethBindingData.eth = props.thirdPartyWallet.address
          // } else if (currentChain() == CurrentSupportChain.Polygon) {
          //   ethBindingData.polygon = props.thirdPartyWallet.address
          // }
          if (bingdMetaidTypes.code == 0 && bingdMetaidTypes.data.thirdPartyAddresses) {
            ethBindingData = {
              ...ethBindingData,
              ...JSON.parse(bingdMetaidTypes.data.thirdPartyAddresses),
            }
          }
          if (res.code === 0) {
            const newBfrcNode = await hdWallet.provider.getNewBrfcNodeBaseInfo(
              hdWallet.wallet.xpubkey.toString(),
              res.data.infoTxId
            )
            const ethBindBrfc = await hdWallet.createNode({
              nodeName: NodeName.ETHBinding,
              parentTxId: res.data.infoTxId,
              data: JSON.stringify(ethBindingData),
              utxos: utxos,
              change: hdWallet.rootAddress,
            })

            if (ethBindBrfc) {
              await hdWallet.provider.broadcast(transfer.toString())
              await hdWallet.provider.broadcast(ethBindBrfc.hex!)
              resolve()
            }
          }
        }
      } else {
        reject(new Error(i18n.t('spaceEnghout')))
      }
    } catch (error) {
      reject(error)
    }
  })
}

function loginByMnemonic(mnemonic: string, password: string, isInitMnemonic = false, path: number) {
  return new Promise<BindMetaIdRes>(async (resolve, reject) => {
    try {
      const decodeMnemonic = decryptMnemonic(mnemonic, password)

      const word = await GetRandomWord()

      if (word.code == 0) {
        const hdWallet = await hdWalletFromMnemonic(
          decodeMnemonic,
          'new',
          import.meta.env.VITE_NET_WORK,
          path
        )

        const sign = signature(
          word.data.word,
          hdWallet.deriveChild(0).deriveChild(0).privateKey.toString()
        )

        const loginInfo = await MnemoicLogin({
          xpub: hdWallet.xpubkey.toString(),
          sign,
          word: word.data.word,
          type: 1,
        })
        if (loginInfo.code == 0) {
          resolve({
            userInfo: Object.assign(loginInfo.data, {
              enCryptedMnemonic: isInitMnemonic
                ? encryptMnemonic(
                    decodeMnemonic,
                    MD5(props.thirdPartyWallet.signAddressHash).toString()
                  )
                : mnemonic,
              userType: loginInfo.data.register || loginInfo.data.registerType,
            }),
            wallet: hdWallet,
            password: password,
          })
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}

function bindingMetaidOrAddressLogin() {
  return new Promise<BindMetaIdRes>(async (resolve, reject) => {
    try {
      // get metaId
      const numberReg = /^\d+(\.\d+)?$/
      const params: any = {
        userType: numberReg.test(form.account) ? 'phone' : 'email',
        phone: numberReg.test(form.account) ? form.account : undefined,
        email: numberReg.test(form.account) ? undefined : form.account,
        evmAddress: props.thirdPartyWallet.address,
        chainId: props.thirdPartyWallet.chainId,
      }

      const resp = await GetMetaIdByLoginName(params)

      if (resp.code === 0) {
        // const mnemonic = await loginByMetaidOrAddress({
        //   metaId: resp.result.metaId,
        // })
        // @ts-ignore
        if (resp.code == 0) {
          const res = await loginByMnemonic(
            resp.result.enMnemonic,
            form.pass,
            true,
            resp.result.path
          )

          console.log('res', res)
          console.log('userStore', userStore)

          await createETHBindingBrfcNode(res)

          res.userInfo.evmAddress = props.thirdPartyWallet.address.toLocaleLowerCase()
          res.userInfo.chainId = props.thirdPartyWallet.chainId
          await sendHash(res.userInfo)
          resolve(res)
        }
      }
    } catch (error) {
      console.log('error', error)

      reject(error)
    }
  })
}

function sendHash(userInfo: BindUserInfo) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await setHashData({
        address: userInfo.ethAddress || userInfo.evmAddress,
        accessKey: userInfo.token,
        userName:
          userInfo.register == 'email' || userInfo.registerType == 'email'
            ? userInfo.email
            : userInfo.phone,
        timestamp: +new Date(),
        metaId: userInfo.metaId,
        evmEnMnemonic: userInfo.enCryptedMnemonic,
        chainId: userInfo.chainId,
      })
      // @ts-ignore

      if (res.code == 0) {
        // @ts-ignore
        resolve(res.msg)
      }
    } catch (error) {
      reject(error)
    }
  })
}

defineExpose({
  loginByMnemonic,
  loginSuccess,
  status: status,
  createMetaidAccount,
  emit,
  createETHBindingBrfcNode,
  sendHash,
})
</script>

<style lang="scss" scoped src="./BindMetaId.scss"></style>

<template>
  <ElDialog
    custom-class="dialogWrap"
    :title="dialogTitle"
    :model-value="props.modelValue"
    :close-on-click-modal="false"
    center
  >
    <div class="signWrap" v-if="signType == 1 || signType == 4">
      <div class="logoWrap">
        <img src="@/assets/images/MetaMask_Fox.svg.png" alt="" />
      </div>
      <div class="tips" v-if="signType == 1">
        <span>{{ $t('useMetaMaskSign') }}</span>
      </div>
      <div class="tips" v-else-if="signType == 4">
        <span>{{ $t('useMeraMaskSucc') }}</span>
        <span>{{ $t('setMetaIDInfo') }}</span>
      </div>
    </div>
    <div v-if="noWallet" class="noWalletTips">
      <img src="@/assets/images/MetaMask_Fox.svg.png" alt="" />
      <a href="https://metamask.io/download/" target="blank">{{ $t('downloadMetaMask') }}</a>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRootStore } from '@/store/root'
import { useUserStore } from '@/store/user'
import Web3SDK from '@/utils/ethers'
import { toQuantity } from 'ethers'
import { ElMessage, ElMessageBox } from 'element-plus'
import { TagType } from '@/enum'
interface Props {
  modelValue: boolean
}

enum SignType {
  isLogined = 1,
  isBindMetaidOrAddressLogin = 2,
  isRegister = 3,
  isPending = 4,
}
const props = withDefaults(defineProps<Props>(), {})
const rootStore = useRootStore()
const userStore = useUserStore()
const emit = defineEmits(['update:modelValue', 'success', 'logout', 'bindEvmAccount'])
const signType = ref(SignType.isLogined)
const noWallet = ref(false)
const i18n = useI18n()
watch(
  () => props.modelValue,
  async () => {
    if (props.modelValue) {
      MetaMaskConnect()
    }
  }
)

onMounted(() => {
  ;(window as any)?.ethereum?.on('accountsChanged', (account: string[]) => {
    userStore.logout()
    if (account.length > 0) {
      MetaMaskConnect()
    }
  })
  // ;(window as any)?.ethereum?.on('networkChanged', (networkIDstring: string[]) => {
  //   console.log('toQuantity(11155111)', toQuantity(11155111), networkIDstring)
  //   const whiteChainList = [1, 5, 11155111]
  //   if (!whiteChainList.includes(+networkIDstring)) {
  //
  //     // return ElMessage.error(`暂不支持其他链`)
  //     ElMessageBox.confirm(
  //       i18n.t('MetaMak.Chain Network Error Tips') + `${import.meta.env.VITE_ETH_CHAIN}`,
  //       i18n.t('MetaMak.Chain Network Error'),
  //       {
  //         customClass: 'primary',
  //         confirmButtonText: i18n.t('MetaMak.Change') + `${import.meta.env.VITE_ETH_CHAIN}`,
  //         cancelButtonText: i18n.t('Cancel'),
  //       }
  //     ).then((res) => {
  //       ;(window as any)?.ethereum?
  //         .request({
  //           method: 'wallet_switchEthereumChain',
  //           params: [
  //             {
  //               chainId: import.meta.env.VITE_ETH_CHAIN == 'eth' ? '0x1' : '0xaa36a7',
  //             },
  //           ],
  //         })
  //         .then((res: string[]) => {
  //           MetaMaskConnect()
  //         })
  //         .catch((error: any) => {
  //           ElMessage.error(error.message)
  //           emit('update:modelValue', false)
  //         })
  //     })

  //     // ;(window as any)?.ethereum?.request({
  //     //   method: 'wallet_switchEthereumChain',
  //     //   params: [
  //     //     {
  //     //       chainId: toQuantity(+networkIDstring),
  //     //     },
  //     //   ],
  //     // })
  //   }
  // })
  // console.log('user', userStore.user)
})

const dialogTitle = computed(() => {
  if (signType.value === SignType.isLogined) {
    if (noWallet.value) {
      return i18n.t('checkEnvNoWallet')
    } else {
      return ``
    }
  } else if (signType.value === SignType.isBindMetaidOrAddressLogin) {
    return i18n.t('bindMetaidOrAddress')
  } else if (signType.value === SignType.isRegister) {
    return i18n.t('registerLogin')
  } else if (signType.value == SignType.isPending) {
    return i18n.t('selectLoginType')
  }
})

function sleep(timeout: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, timeout * 1000)
  })
}

function sign() {
  return new Promise(async (resolve, reject) => {
    try {
      await sleep(1)
      rootStore.InitWeb3Wallet(await new Web3SDK())
      resolve(true)
    } catch (error) {
      reject()
    }
  })
}

async function MetaMaskConnect() {
  const { isUpdatePlan, loginedButBind, bindEvmChain } = rootStore.showLoginBindEvmAccount

  try {
    if (rootStore.chainWhiteList.includes((window as any)?.ethereum?.chainId)) {
      const connetSuccess = await sign()

      if (connetSuccess) {
        const type = isUpdatePlan ? TagType.old : TagType.new
        const signHash = await rootStore.GetWeb3Wallet.sign(type)

        if (signHash && !loginedButBind) {
          emit('success', {
            signAddressHash: signHash,
            address: rootStore.GetWeb3Wallet.signer.address,
          })
        }
      }
    } else {
      emit('update:modelValue', false)
      ElMessageBox.confirm(
        i18n.t('MetaMak.Chain Network Error Tips') + `${import.meta.env.VITE_ETH_CHAIN}`,
        i18n.t('MetaMak.Chain Network Error'),
        {
          customClass: 'primary',
          confirmButtonText: i18n.t('MetaMak.Change') + `${import.meta.env.VITE_ETH_CHAIN}`,
          cancelButtonText: i18n.t('Cancel'),
        }
      )
        .then(() => {
          ;(window as any)?.ethereum
            .request({
              method: 'wallet_switchEthereumChain',
              params: [
                {
                  chainId: rootStore.chainWhiteList[0],
                },
              ],
            })
            .then((res: string[]) => {
              setTimeout(() => {
                MetaMaskConnect()
              }, 1000)
            })
            .catch((error: any) => {
              ElMessage.error(error.message)
              emit('update:modelValue', false)
            })
        })
        .catch(() => {
          emit('update:modelValue', false)
        })
    }
  } catch (error) {
    emit('update:modelValue', false)
  }
}
</script>

<style lang="scss" scoped src="./MetaMask.scss"></style>
<style>
.dialogWrap {
  width: 440px;
}
</style>

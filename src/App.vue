<script setup lang="ts">
import ConnectWalletModalVue from '@/components/ConnectWalletModal/ConnectWalletModal.vue'
import { useRootStore } from './store/root'
import Web3SDK from '@/utils/ethers'
import { onMounted, ref } from 'vue'
import { useUserStore } from './store/user'
import { SDK } from '@/utils/sdk'
import { diffTime, mappingCurrentChainName } from '@/utils/util'
import { ConnectType } from '@/enum'
import { ElMessage } from 'element-plus'
import { ReceiverChainName, ETHChain } from '@/enum'

const currentChainName = ref(setCurrentChainName())

function sleep() {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(true)
    }, 1000)
  )
}

function setCurrentChainName() {
  switch (mappingCurrentChainName((window as any)?.ethereum?.chainId)) {
    case ReceiverChainName.ETH:
      return ReceiverChainName.ETH
    case ReceiverChainName.OP:
      return ReceiverChainName.OP
    case ReceiverChainName.ARB:
      return ReceiverChainName.ARB
  }
}

onMounted(async () => {
  const rootStore = useRootStore()
  const userStore = useUserStore()
  // if ((window as any).WallectConnect) {
  //
  //   rootStore.InitWeb3Wallet(await new Web3SDK(ConnectType.WalletConnect))
  // } else {
  //   rootStore.InitWeb3Wallet(await new Web3SDK(ConnectType.MetaMask))
  // }

  rootStore.getExchangeRate()
  rootStore.InitOrderApi()
  console.log('!rootStore.isWalletConnect', rootStore.isWalletConnect)
  ;(window as any)?.ethereum?.on('networkChanged', (networkIDstring: string[]) => {
    currentChainName.value = setCurrentChainName()
  })

  await rootStore.setReceiverAddress(currentChainName.value).catch((e) => ElMessage.error(e))

  rootStore.setCurretnETHChain(ETHChain[currentChainName.value.toLocaleUpperCase()])
  if (
    (window as any)?.ethereum &&
    rootStore.chainWhiteList.includes((window as any)?.ethereum?.chainId) &&
    !rootStore.isWalletConnect
  ) {
    rootStore.InitWeb3Wallet(await new Web3SDK())
  }
  if (userStore.isAuthorized) {
    if (!userStore.showWallet) {
      userStore.$patch({ wallet: new SDK(import.meta.env.VITE_NET_WORK) })
    }
    if (!userStore.showWallet.isInitSdked && !rootStore.isWalletConnect) {
      await userStore.showWallet.initWallet()
    }
    if (!rootStore.isWalletConnect) {
      await rootStore.GetWeb3AccountBalance()
    }

    // if (diffTime()) {

    // }
  }
})
</script>
<template>
  <RouterView v-if="$route.path === '/' || $route.path.indexOf('/home') !== -1" />
  <div class="flex main" v-else>
    <div class="flex1 main-right">
      <RouterView v-slot="{ Component, route }">
        <KeepAlive>
          <component
            :is="Component"
            :key="route.fullPath"
            v-if="route.meta && route.meta.keepAlive"
          />
        </KeepAlive>
        <component :is="Component" v-if="!route.meta || (route.meta && !route.meta.keepAlive)" />
      </RouterView>
    </div>
  </div>
  <ConnectWalletModalVue />
</template>

<style lang="scss" scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

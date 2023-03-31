<script setup lang="ts">
import ConnectWalletModalVue from '@/components/ConnectWalletModal/ConnectWalletModal.vue'
import { useRootStore } from './store/root'
import Web3SDK from '@/utils/ethers'
import { onMounted } from 'vue'
import { useUserStore } from './store/user'
import { SDK } from '@/utils/sdk'
import { diffTime } from '@/utils/util'
onMounted(async () => {
  const rootStore = useRootStore()
  const userStore = useUserStore()
  if ((window as any).ethereum) {
    rootStore.InitWeb3Wallet(await new Web3SDK())
  }
  if (userStore.isAuthorized) {
    if (!userStore.showWallet) {
      userStore.$patch({ wallet: new SDK(import.meta.env.VITE_NET_WORK) })
    }
    if (!userStore.showWallet.isInitSdked) {
      await userStore.showWallet.initWallet()
    }
    if (diffTime()) {
      rootStore.getExchangeRate()
    }
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

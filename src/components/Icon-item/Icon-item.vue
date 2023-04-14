<template>
  <div class="icon-item-wrap">
    <img :src="IconList[currentIcon.icon]" alt="" />
    <span>{{ currentIcon.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import ETH from '@/assets/images/ETH.png?url'
import POLYGON from '@/assets/images/POLYGON.png?url'
import BSC from '@/assets/images/BSC.png?url'
import USDC from '@/assets/images/USDC.png?url'
import USDT from '@/assets/images/USDT.png?url'
import MVC from '@/assets/images/MVC.png?url'

import { MappingIcon, MappingChainName } from '@/enum'
const IconList = reactive({
  ETH,
  POLYGON,
  BSC,
  USDC,
  USDT,
  MVC,
  Ethereum: ETH,
  Polygon: POLYGON,
  Mvc: MVC,
  ['Tether USD']: USDT,
  ['USD Coin']: USDC,
  ['BNB Chain']: BSC,
  // ['MUSD']: USDT,
  // ['MUSDC']: USDC,
})

interface Props {
  iconMap?: MappingIcon
  chainMap?: MappingChainName
}

const props = withDefaults(defineProps<Props>(), {})
const marginLeft = ref(props.iconMap ? '6px' : '12px')
const currentIcon = computed(() => {
  return {
    name: props.iconMap ? props.iconMap : props.chainMap,
    icon: props.iconMap ? props.iconMap : props.chainMap,
  }
})
</script>

<style lang="scss" scoped>
.icon-item-wrap {
  display: flex;
  align-items: center;

  img {
    width: 30px;
    height: 30px;
  }

  span {
    margin-left: v-bind(marginLeft);
    font-size: 18px;
  }
  @media screen and (max-width: 500px) {
    img {
      width: 25px;
      height: 25px;
    }
    span {
      font-size: 16px;
    }
  }
}
</style>

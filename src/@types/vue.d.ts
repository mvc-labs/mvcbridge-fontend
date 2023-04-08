import { ComponentCustomProperties } from 'vue'
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $filters: {
      spiltAddress: (str: string | undefined) => string
      rateToUsd: (amount: string, coin: string) => string
    }
  }
}

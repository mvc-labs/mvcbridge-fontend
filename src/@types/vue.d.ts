import { ComponentCustomProperties } from 'vue'
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $filters: {
      spiltAddress: (str: string | undefined) => string
      rateToUsd: (amount: string, coin: string) => string
      dateTimeFormat: (timestamp: Date | number, format: string = 'YYYY-MM-DD HH:mm:ss') => string
      omitMiddle: (str: string) => string
    }
  }
}

// @ts-ignore
import { useRootStore } from '@/store/root'
import dayjs from 'dayjs'
import Decimal from 'decimal.js-light'
import { CoinSymbol } from '@/enum'

export const spiltAddress = (str: string | undefined) => {
  if (!str) return 'null'
  return str.replace(/^(.{6}).*(.{3})$/, '$1...$2')
}

export function dateTimeFormat(timestamp: Date | number, format: string = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(timestamp).format(format)
}

export function rateToUsd(amount: string, coin: string) {
  const rootStore = useRootStore()

  let ethRate
  let mvcRate
  rootStore.exchangeRate.forEach((item) => {
    switch (item.symbol) {
      case 'eth':
        ethRate = item
        break
      case 'mvc':
        mvcRate = item
        break
      default:
        break
    }
  })
  switch (coin) {
    case CoinSymbol.ETH:
      return new Decimal(amount).mul(ethRate!.price.USD).toFixed(2)

    case CoinSymbol.SPACE:
      return new Decimal(amount).mul(mvcRate!.price.USD).toFixed(2)

    default:
      return new Decimal(amount).toFixed(2)
  }
}

export function omitMiddle(str: string) {
  if (!str) {
    return '--'
  }
  const ellipsis = '...'
  const ellipsisLength = ellipsis.length

  const startLength = Math.ceil(ellipsisLength)
  const endLength = Math.floor(ellipsisLength)

  const start = str.substring(0, startLength)
  const end = str.substring(str.length - endLength)

  return start + ellipsis + end
}

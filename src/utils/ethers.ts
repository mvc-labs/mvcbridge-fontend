import { ethers, sha256, toUtf8Bytes, toUtf8String, Contract } from 'ethers'
import { TagType } from '@/enum'
import { chainTokenInfo } from '@/utils/util'
// function classDecorator<T extends { new (...args: any[]): {} }>(constructor: T) {
//   return class extends constructor {
//     provider: Provider
//   }
// }
interface tokenType {
  abi: Array<any>
  contractAddress: string
  decimal: number
}
let USDT: tokenType
let USDC: tokenType
function getTokenInfo() {
  const { usdc, usdt } = chainTokenInfo((window as any).ethereum.chainId)
  USDT = usdt
  USDC = usdc
}

// @classDecorator
export default class Web3SDK {
  provider: any = {}
  signer: any = {}
  contract: any[] = []
  usdt: any
  usdc: any

  constructor() {
    return new Promise<{
      provider: any
      signer: any
      contract: any[]
      usdt: any
      usdc: any
    }>(async (resolve) => {
      getTokenInfo()
      this.provider = new ethers.BrowserProvider((window as any).ethereum)
      this.signer = await this.provider.getSigner()
      this.usdt = new Contract(USDT.contractAddress, JSON.stringify(USDT.abi), this.signer)
      this.usdc = new Contract(USDC.contractAddress, JSON.stringify(USDC.abi), this.signer)
      this.contract.push(this.usdt, this.usdc)
      resolve(this)
    })
  }

  async sign(tag: TagType = TagType.new) {
    if (this.provider.ready) {
    } else {
      throw new Error(`Wallet is not Ready`)
    }
    let message
    if (tag === TagType.new) {
      message = toUtf8String(
        toUtf8Bytes(sha256(toUtf8Bytes(this.signer.address.toLocaleLowerCase())))
      )
    } else {
      message = toUtf8String(
        sha256(toUtf8Bytes(this.signer.address.toLocaleLowerCase())).slice(2, -1)
      )
    }
    return await this.signer.signMessage(message)
  }
}

import { ethers, sha256, toUtf8Bytes, toUtf8String, Contract } from 'ethers'
import { TagType, ConnectType } from '@/enum'
import { chainTokenInfo } from '@/utils/util'
import { ElMessage } from 'element-plus'
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
let FAUCET: any
function getTokenInfo() {
  const res = chainTokenInfo((window as any)?.ethereum?.chainId)
  if (!res) {
  } else {
    USDT = res.usdt
    USDC = res.usdc
    FAUCET = res.faucet
  }
}

// @classDecorator
export default class Web3SDK {
  provider: any = {}
  signer: any = {}
  contract: any[] = []
  usdt: any
  usdc: any
  faucet: any
  constructor() {
    return new Promise<{
      provider: any
      signer: any
      contract: any[]
      usdt: any
      usdc: any
      faucet: any
    }>(async (resolve) => {
      getTokenInfo()
      this.provider = new ethers.BrowserProvider((window as any)?.ethereum)

      this.signer = await this.provider.getSigner()
      this.usdt = new Contract(USDT.contractAddress, JSON.stringify(USDT.abi), this.signer)
      this.usdc = new Contract(USDC.contractAddress, JSON.stringify(USDC.abi), this.signer)
      this.faucet = new Contract(FAUCET.contractAddress, JSON.stringify(FAUCET.abi), this.signer)
      this.contract.push(this.usdt, this.usdc, this.faucet)
      console.log('zxczxczxc1111', this.contract)
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
      if (import.meta.env.MODE == 'gray') {
        message = toUtf8String(
          sha256(toUtf8Bytes(this.signer.address.split('0x')[1].toLocaleLowerCase())).slice(2, -1)
        )
      } else {
        message = toUtf8String(
          sha256(toUtf8Bytes(this.signer.address.toLocaleLowerCase())).slice(2, -1)
        )
      }
    }
    return await this.signer.signMessage(message)
  }
}

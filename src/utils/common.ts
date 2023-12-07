import { useRootStore } from '@/store/root'
import { OrderRegisterRequest } from 'mvcbridge-sdk/api'
import { MappingIcon } from '@/enum'
import { SignatureHelper } from 'mvcbridge-sdk/signature'
import { GeneratorSignatrue } from '@/utils/util'
export function RetryWaitRequest(params) {
  const rootStore = useRootStore()
  let registerRequest: OrderRegisterRequest
  return new Promise(async (resolve, reject) => {
    if (params.Send !== MappingIcon.MVC) {
      registerRequest = {
        fromChain: params.fromChain,
        fromTokenName: params.Currency.toLowerCase(),
        txid: params.TX,
        amount: params.fromAmount,
        fromAddress: params.fromAddress,
        toChain: params.toChain,
        toTokenName: params.Currency.toLowerCase(),
        toAddress: params.toAddress,
      }
      const message = SignatureHelper.getSigningMessageFromOrder(registerRequest)
      const sign = await rootStore.GetWeb3Wallet.signer.signMessage(message)
      if (sign) {
        registerRequest.signature = sign
        rootStore.orderApi
          .orderRegisterPost(registerRequest)
          .then((order: any) => {
            console.log('order', order)
            resolve(order)
          })
          .catch((e: any) => {
            reject(e)
          })
      }
    } else {
      registerRequest = GeneratorSignatrue({
        fromChain: params.fromChain,
        fromTokenName: params.Currency.toLowerCase(),
        txid: params.TX,
        amount: params.fromAmount,
        fromAddress: params.fromAddress,
        toChain: params.toChain,
        toTokenName: params.Currency.toLowerCase(),
        toAddress: params.toAddress,
      })
      if (registerRequest) {
        rootStore.orderApi
          .orderRegisterPost(registerRequest)
          .then((order: any) => {
            resolve(order)
          })
          .catch((e: any) => {
            reject(e)
          })
      }
    }
  })
}

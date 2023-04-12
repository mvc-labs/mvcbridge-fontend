declare interface GetMeUtxosRes extends apiResponse {
  data: {
    address: string
    amount: number
    index: number
    tx: string
    script: string
  }
}

declare interface GetReceiveAddressType {
  address: string
  chain: string
  tokenName: string
  depositMinAmount: number
  decimal: number
  depositConfirmation: number
  withdrawGasFee: number
  withdrawBridgeFeeRate: string
}

declare interface GetMyMEBalanceRes extends apiResponse {
  data: {
    count: number
  }
}

declare interface GetProtocolMeInfoRes {
  is_support: boolean
  limit_amount: number
  me_amount: number
  me_amount_max: number
  me_amount_min: number
  me_rate_amount: number
  protocol: string
  tip_description: string
  tip_name: string
}

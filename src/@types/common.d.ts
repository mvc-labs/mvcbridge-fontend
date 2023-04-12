declare interface UserInfo {
  name: string
  pk2: string
  tag: 'new' | 'old'
  avatarType: string
  avatarTxId: string
  avatarImage: string
  email: string
  phone: string
  token: string
  appToken: string
  metaId: string
  address: string
  register: string
  lastLoginTime: number | null
  enCryptedMnemonic: string
  userType: string
  infoTxId: string
  protocolTxId: string
  flag?: boolean
  evmAddress?: string
  loginType: 'MetaID' | 'MetaMask'
  metaName: string
  path: number
  registerType?: string
}

declare interface NewNodeBaseInfo {
  address: string
  path: string
  publicKey: string
}

declare interface NodeTransactions {
  payToAddress?: import('@/@types/sdk.d.ts').CreateNodeBaseRes
  metaFileBrfc?: import('@/@types/sdk.d.ts').CreateNodeBrfcRes
  metaFiles?: import('@/@types/sdk.d.ts').CreateNodeMetaFileRes[]
  currentNodeBrfc?: import('@/@types/sdk.d.ts').CreateNodeBrfcRes
  currentNode?: import('@/@types/sdk.d.ts').CreateNodeBaseRes
  sendMoney?: import('@/@types/sdk.d.ts').CreateNodeBaseRes
  subscribeId?: string
  ft?: {
    transfer?: {
      checkTransaction: mvc.Transaction
      checkTxId: string
      transaction: mvc.Transaction
      txId: string
    }
  }
  nft?: {
    issue?: {
      transaction: mvc.Transaction
      txId: string
      tokenIndex: string
    }
    genesis?: {
      transaction: mvc.Transaction
      genesis: string
      codehash: string
      sensibleId: string
      txId: string
    }
    transfer?: {
      transaction: mvc.Transaction
      txId: string
    }
    sell?: {
      sellTransaction: mvc.Transaction
      sellTxId: string
      transaction: string
      txId: string
    }
    cancel?: {
      unlockCheckTransaction: mvc.Transaction
      unlockCheckTxId: string
      transaction: mvc.Transaction
      txId: string
    }
    buy?: {
      unlockCheckTransaction: mvc.Transaction
      unlockCheckTxId: string
      transaction: mvc.Transaction
      txId: string
    }
  }
}

declare interface Job {
  id: string
  name: string
  steps: JobStep[]
  status: import('@/enum').JobStatus
}

declare interface JobStep {
  txId?: string
  txHex: string
  status: import('@/enum').JobStepStatus
  resultTxId?: string
  resultTxMessage?: string
  metanetId?: string
}

declare interface SetUserInfo extends UserInfo {
  password?: string
  chainId?: string
}

declare interface ProtocolBrfcNode {
  address: string
  data: string
  nodeName: string
  parentPublicKey: string
  parentTxId: string
  publicKey: string
  timestamp: number
  txId: string
  version: string
  xpub: string
  addressType: number
  addressIndex: number
}

declare interface UserProtocolBrfcNode extends ProtocolBrfcNode {
  nodeName: import('@/enum').NodeName
  brfcId: string
}

declare interface CreateBrfcNodePrams {
  nodeName: import('@/enum').NodeName
  parentTxId: string
  payTo?: { amount: number; address: string }[]
  utxos?: UtxoItem[]
  useFeeb?: number
}

declare interface BindMetaIdRes {
  userInfo: MetaMaskLoginUserInfo
  wallet: bsv.HDPrivateKey
  password: string
}

declare interface BindUserInfo {
  address: string
  appToken: string
  did: null
  email: string
  enCryptedMnemonic: string
  lastLoginTime: number
  metaId: string
  name: string
  phone: string
  pk2: string
  register: string
  registerType?: string
  tag: 'new' | 'old'
  token: string
}

declare interface NewBrfcNodeBaseInfo extends NewNodeBaseInfo {
  isUsed: boolean
  parentTxId: string
}

declare interface ExchangeRate {
  symbol: string
  price: {
    CNY: string
    USD: string
  }
  remark: string
  updateTime: number
}

declare interface OrderHistroyItem {
  vaultId: string
  txid: string
  fromAddress: string
  fromAmount: string
  fromChain: string
  state: string
  targetAmount: string
  targetVaultId: string
  toAddress: string
  finalizedTimestamp?: number
  confirmationRequired?: number
  currentConfirmation?: number
}

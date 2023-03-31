import { HdWalletChain, IsEncrypt } from '@/enum'

export interface AppMsg {
  name: string
  website: string
  mode: AppMode
  isProduction?: boolean // 保留 isProduction 兼容旧版本
}

export interface createBrfcChildNodeParams {
  nodeName: NodeName
  autoRename?: boolean
  appId?: string[]
  encrypt?: IsEncrypt
  version?: string
  data?: string
  dataType?: string
  payCurrency?: string
  payTo?: PayToItem[]
  encoding?: string
  needConfirm?: boolean // 是否需要确认
  attachments?: AttachmentItem[] // 附件
  utxos?: any[] // 传入的utxos
  ecdh?: { type: string; publickey: string } // ecdh
  useFeeb?: number // 费率
  meConvertSatoshi?: number // 1Me 等于多少聪
  loading?: { close: () => void }
  payType?: SdkPayType
  // 修改
  publickey?: string // 修改时 用的publicekey
  txId?: string
}

export interface CreateNodeBaseRes {
  txId: string
  transaction?: bsv.Transaction
  scriptPlayload?: (string | Buffer)[]
  hex?: string
}

export interface CreateNodeBrfcRes extends CreateNodeBaseRes {
  address: string
  addressType: number
  addressIndex: number
}

export interface HdWalletCreateBrfcChildNodeParams {
  nodeName: string
  autoRename?: Boolean
  appId?: string[]
  encrypt?: IsEncrypt
  version?: string
  data?: string
  dataType?: string
  payCurrency?: string
  payTo?: PayToItem[]
  encoding?: string
  needConfirm?: boolean // 是否需要确认
  attachments?: AttachmentItem[] // 附件
  utxos?: any[] // 传入的utxos
  publickey?: string // 修改时 用的publicekey
  ecdh?: { type: string; publickey: string } // ecdh
  useFeeb?: number // 费率
  meConvertSatoshi?: number
  brfcTxId: string
}

export interface MetaIdJsRes {
  code: number
  data: any
  status?: string
  handlerId?: string
  appAccessToken?: string
}

export interface UtxoItem {
  address: string
  // utxo 所在的路径
  addressIndex: number
  addressType: number
  // txIndex: number
  outputIndex: number
  txId: string
  // value: number
  xpub?: string
  script: string
  amount: number
  satoshis: number
  wif?: string // nft需要
}

export interface UtxoItem {
  address: string
  // utxo 所在的路径
  addressIndex: number
  addressType: number
  // txIndex: number
  outputIndex: number
  txId: string
  // value: number
  xpub?: string
  script: string
  amount: number
  satoshis: number
  wif?: string // nft需要
}

export interface TransferTypes {
  amount?: number
  to?: string
  payCurrency?: string
  outputs?: UtxoItem[]
  payTo?: PaytoTypes | PaytoTypes[]
  from?: BaseUtxo[]
  change?: string
  utxos?: MetasvUtxoTypes[]
  opReturn?: (string | Buffer)[]
  needConfirm?: boolean
  useFeeb?: number
  chain?: HdWalletChain
}

export interface CreateNodeOptions {
  nodeName: string
  metaIdTag?: string
  data?: string | Buffer
  parentTxId?: string
  outputs?: any[]
  change?: string
  utxos?: UtxoItem[]
  payTo?: PayToItem[]
  encrypt?: IsEncrypt
  version?: string
  dataType?: string
  encoding?: string
  node?: {
    // 创建新节点的信息， 当创建bfrc节点时需要传， 创建bfrc 子节点时不用传，自动生成
    address: string
    publicKey: string
    path: string
  }
  chain?: HdWalletChain
}

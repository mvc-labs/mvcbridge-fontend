export interface MetaMaskLoginUserInfo {
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
  userType?: string
  evmAddress?: string
}

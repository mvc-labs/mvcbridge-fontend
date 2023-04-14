import HttpRequest from '@/utils/request'
//${import.meta.env.VITE_BASEAPI}
const aggregation = new HttpRequest(`${import.meta.env.VITE_HOST_API}/aggregation`, {
  header: {
    SiteConfigMetanetId: import.meta.env.VITE_SiteConfigMetanetId,
  },
}).request

export const GetUserInfo = (
  metaId: string
): Promise<{
  code: number
  data: {
    metaId: string
    metaIdTag: string
    address: string
    pubKey: string
    infoTxId: string
    infoPublicKey: string
    protocolTxId: string
    protocolPublicKey: string
    name: string
    nameEncrypt: string
    phone: string
    phoneEncrypt: string
    email: string
    emailEncrypt: string
    avatarTxId: string
    avatarEncrypt: string
    coverUrl: string
    coverType: string
    coverPublicKey: string
    timestamp: number
  }
}> => {
  return aggregation.get(`/v2/app/user/getUserInfo/${metaId}`)
}

export const GetBindMetaidAddressList = (
  metaid: string
): Promise<{
  code: number
  data: {
    thirdPartyAddresses?: string
  }
}> => {
  return aggregation.get(`/v2/app/user/${metaid}/third/addresses`)
}

export const GetMetaNameInfo = (
  name: string
): Promise<{
  code: number
  data: {
    name: string
    resolveAddress: string
    ownerAddress: string
  }
}> => {
  return aggregation.get(`/v2/app/metaname/indexer/info`, { params: { name } })
}

export const GetMetaIdByAddress = (
  address: string
): Promise<{
  code: number
  data: string
}> => {
  return aggregation.get(`/v2/app/user/metaId/${address}/address/absolute`)
}

export const GetUserAllInfo = (
  metaId: string
): Promise<{
  code: number
  data: UserAllInfo
}> => {
  return aggregation.get(`/v2/app/user/getUserAllInfo/${metaId}`)
}

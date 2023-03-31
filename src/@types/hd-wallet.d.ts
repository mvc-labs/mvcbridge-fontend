export interface PayToItem {
  amount: number
  address: string
}

export interface AttachmentItem {
  fileName: string
  fileType: string
  data: string
  encrypt: IsEncrypt
  sha256: string
  size: number
  url: string
}

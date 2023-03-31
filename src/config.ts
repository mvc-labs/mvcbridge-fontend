export const currentSupportChain: Array<{
  chainId: string
  chainName: string
}> = [
  {
    chainId: '0x1',
    chainName: 'eth',
  },
  {
    chainId: '0xaa36a7',
    chainName: 'sepolia',
  },
  {
    chainId: '0x5',
    chainName: 'goerli',
  },
  {
    chainId: '0x89',
    chainName: 'polygon',
  },
  {
    chainId: '0x13881',
    chainName: 'mumbai',
  },
]

export interface ethBindingData {
  evmAddress: string
}

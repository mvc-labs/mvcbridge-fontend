import {
  AppMsg,
  createBrfcChildNodeParams,
  CreateNodeBaseRes,
  CreateNodeBrfcRes,
  HdWalletCreateBrfcChildNodeParams,
  MetaIdJsRes,
  UtxoItem,
} from '@/@types/sdk'
import Decimal from 'decimal.js-light'
import { router } from '@/router'
import { DEFAULTS, HdWallet, hdWalletFromAccount } from '@/utils/wallet/hd-wallet'
import { isAndroid, isAndroidApp, isIOS, isIosApp } from '@/store/root'
import { PayToItem } from '@/@types/hd-wallet'
import {
  SdkPayType,
  NodeName,
  JobStepStatus,
  JobStatus,
  HdWalletChain,
  WalletTxVersion,
  Network,
} from '@/enum'
import { GetMeUtxos, GetMyMEBalance, GetProtocolMeInfo } from '@/api/v3'
import { getLocalAccount } from './util'
import { Transaction } from 'dexie'
import { useUserStore } from '@/store/user'
import { useRootStore } from '@/store/root'
import { useJobsStore } from '@/store/jobs'
// import SdkPayConfirmModalVue from '@/components/SdkPayConfirmModal/SdkPayConfirmModal.vue'
import { h, render } from 'vue'
//@ts-ignore
import { v1 as UUID } from 'uuid'
import { mvc } from 'meta-contract'
import { GetTx } from '@/api/metaid-base'
import AllNodeName from './AllNodeName'
enum AppMode {
  PROD = 'prod',
  GRAY = 'gray',
  TEST = 'test',
  DEV2 = 'dev2',
}

export class SDK {
  // Nft收手续费的地址
  appAddress = {
    [AppMode.PROD]: '19NeJJM6eEa3bruYnqkTA4Cp6VvdFGSepd',
    [AppMode.TEST]: '1BrfsynMJ56gc2HFicgpBhEKRtRQYTm82E',
  }

  appMsg: AppMsg | null = null
  appMetaIdJs = (window as any).appMetaIdJsV2
  wallet: HdWallet | null = null
  isInitSdked = false
  network = Network.mainnet
  bfrcNodeList: { nodeName: NodeName; data: CreateNodeBrfcRes }[] = [] // 存储Brfc节点， 防止未广播时重复构建
  metaFileSha256TxIdList: { sha256: string; txId: string }[] = [] // 存储metaFileSha256TxId， 防止未广播时重复构建
  transactionsNFTKey = {
    [NodeName.NftGenesis]: 'genesis',
    [NodeName.NftTransfer]: 'transfer',
    [NodeName.NftSell]: 'sell',
    [NodeName.NftCancel]: 'cancel',
    [NodeName.nftBuy]: 'buy',
  }
  transactionsFTKey = {
    [NodeName.FtTransfer]: 'transfer',
  }

  constructor(network: any) {
    this.network = network
    if (this.appMetaIdJs) this.isInitSdked = true
  }

  randomString() {
    return Math.random().toString().replace('.', '')
  }

  initWallet() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const account = getLocalAccount()

        const walletObj = await hdWalletFromAccount(
          {
            ...account.userInfo,
            password: account.password,
          },
          this.network,
          account.userInfo.path
        )

        const wallet = new HdWallet(walletObj.wallet)

        this.wallet = wallet
        this.isInitSdked = true
        resolve()
      } catch (error) {
        console.error(error)
        reject(new Error('Failed to generate wallet' + (error as any).message))
      }
    })
  }

  checkAppHasMethod(methodName: string) {
    return new Promise<void>((resolve, reject) => {
      // @ts-ignore
      if (window.appMetaIdJsV2[methodName]) {
        resolve()
      } else {
        reject(
          Error(
            'The current App version does not support this function, please upgrade to the latest version first'
          )
        )
      }
    })
  }

  appSetUserInfo() {
    return new Promise<void>(async (resolve, reject) => {
      const userStore = useUserStore()
      await this.checkAppHasMethod('getUserInfo')
      const callback = async (res: MetaIdJsRes) => {
        try {
          if (typeof res === 'string') res = JSON.parse(res)
          if (res.code === 200) {
            if (res.appAccessToken) {
              res.data.token = res.appAccessToken
            }
            res.data.metaId = res.data.showId
            const userInfo = res.data
            if (userInfo) {
              userStore.updateUserInfo(userInfo)
              resolve()
            }
          } else {
            resolve()
          }
        } catch (error) {
          resolve()
        }
      }
      const functionName = `getUserInfoCallBack${this.randomString()}`
      // @ts-ignore
      window[functionName] = callback
      this.appMetaIdJs?.getUserInfo('', '', functionName)
    })
  }

  //
  async callback(
    res: MetaIdJsRes,
    option?: {
      resolve?: (value: any) => any
      reject?: (reason: any) => void
    }
  ) {
    if (typeof res === 'string') {
      try {
        res = JSON.parse(res)
      } catch (error) {
        if (option?.reject) option?.reject(error)
        else return error
      }
    }
    if (res.code !== 200 && res.code !== 205 && res.code !== 201) {
      if (option?.reject) {
        if (res.data.message) {
          option?.reject(new Error(res.data.message))
        } else {
          option?.reject(undefined)
        }
      } else return res
    } else {
      if (option?.resolve) option?.resolve(res.data)
      else return res.data
    }
  }

  getAppAddress() {
    const env =
      this.appMsg?.isProduction ||
      this.appMsg?.mode === AppMode.PROD ||
      this.appMsg?.mode === AppMode.GRAY
        ? AppMode.PROD
        : AppMode.TEST

    return this.appAddress[env]
  }

  checkSdkStatus() {
    return new Promise<void>((resolve, reject) => {
      if (this.appMetaIdJs) {
        resolve()
      } else {
        const userStore = useUserStore()
        if (userStore.isAuthorized) {
          if (this.wallet) {
            resolve()
          } else {
            reject(new Error('Failed to generate wallet, please try to log in again'))
          }
        } else {
          reject(new Error('Please log in first, then operate'))
        }
      }
    })
  }

  //
  sigMessage(msg: string, path = '0/0') {
    return new Promise<string>(async (resolve, reject) => {
      try {
        await this.checkSdkStatus()
        const userStore = useUserStore()
        if (this.appMetaIdJs) {
          await this.checkAppHasMethod('sigMessage')
          const callback = (res: MetaIdJsRes) => {
            this.callback(res, { reject, resolve })
          }
          const callbackName = 'sigMessageCallback'
          // @ts-ignore
          window[callbackName] = callback
          this.appMetaIdJs!.sigMessage(
            userStore.user?.token,
            JSON.stringify({
              msg,
              path,
            }),
            callbackName
          )
        } else {
          const res = await this.wallet?.sigMessage(msg, path)
          if (res) {
            resolve(res)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  TransferFt(
    params: createBrfcChildNodeParams,
    option?: {
      isBroadcast?: boolean
      payType?: SdkPayType
    }
  ) {
    return new Promise<NodeTransactions | null>(async (resolve, reject) => {
      const userStore = useUserStore()
      const initOption = {
        isBroadcast: true,
        payType: userStore.sdkPayment,
        useQueue: false,
        subscribeId: '',
      }
      option = {
        ...initOption,
        ...option,
      }
      try {
        //
        if (this.appMetaIdJs) {
          await this.checkAppHasMethod('createBrfcChildNode')
          const functionName = `createBrfcChildNode${this.randomString()}`
          const callback: (res: string) => void = (res: any) => {
            this.callback(res, { resolve, reject })
          }
          // @ts-ignore
          window[functionName] = callback
          if (params.loading) delete params.loading
          if (params.attachments!.length > 0) {
            for (let i = 0; i < params.attachments!.length; i++) {
              // @ts-ignore
              params.attachments[i].data = params.attachments[i].hex
            }
          }
          this.appMetaIdJs.createBrfcChildNode(
            userStore.user?.token,
            JSON.stringify(params),
            functionName
          )
        } else {
          //
          let transactions = await this.createFtTransferTransactions(params)

          let payToRes: CreateNodeBaseRes | undefined = undefined
          if (!params.utxos?.length) {
            //
            let totalAmount = this.getNodeTransactionsAmount(transactions, params.payTo)
            totalAmount += 70000
            const rootStore = useRootStore()
            if (+rootStore.mvcWalletTokenBalance.space <= 0) {
              reject(`Space balance is not enough to support this transfer`)
            }
            if (
              +rootStore.mvcWalletTokenBalance.space > 0 &&
              new Decimal(rootStore.mvcWalletTokenBalance.space).mul(10 ** 8).toNumber() <
                totalAmount
            ) {
              reject(`Space balance is not enough to support this transfer`)
            }
            const useSatoshis = totalAmount
            if (true) {
              let receive = {
                address: this.wallet.rootAddress,
                addressType: 0,
                addressIndex: 0,
              }

              //this.getNodeTransactionsFirstReceive(transactions, params)

              const getUtxoRes = await this.getAmountUxto({
                sdkPayType: option.payType!,
                amount: useSatoshis,
                receive,
              })

              const currentUtxo = getUtxoRes.utxo
              if (getUtxoRes.payToRes) {
                payToRes = getUtxoRes.payToRes
              }

              //
              transactions = await this.setUtxoForTransferFtTransactions(
                transactions,
                currentUtxo!,
                params,
                //
                option.payType === SdkPayType.ME
                  ? import.meta.env.VITE_CHANGE_ADDRESS
                  : this.wallet!.rootAddress
              )

              //
              if (option.isBroadcast) {
                //
                if (payToRes && payToRes.transaction) {
                  await this.wallet?.provider.broadcast(payToRes.transaction.toString())
                }
                //
                await this.broadcastNodeTransactions(transactions)
              }

              resolve({
                payToAddress: payToRes,
                ...transactions,
              })
            } else {
              resolve(null)
            }
          } else {
            //

            //
            if (option.isBroadcast) {
              // if (payToRes && payToRes?.transaction) {
              //   await this.wallet?.provider.broadcast(payToRes.transaction.toString())
              // }
              //
              await this.broadcastNodeTransactions(transactions)
            }

            resolve({
              payToAddress: payToRes,
              ...transactions,
            })
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  createBrfcChildNode(
    params: createBrfcChildNodeParams,
    option?: {
      isBroadcast?: boolean
      payType?: SdkPayType
      useQueue?: boolean
      subscribeId?: string
      checkOnly?: boolean //
    }
  ) {
    return new Promise<NodeTransactions | null>(async (resolve, reject) => {
      const userStore = useUserStore()

      const initOption = {
        isBroadcast: true,
        payType: userStore.sdkPayment,
        useQueue: false,
        subscribeId: '',
      }
      const initParams = {
        appId: ['AssertBrige', this.getOnLinkAppUrl(), this.getPlatform()],
        autoRename: true,
        version: '0.0.9',
        data: 'NULL',
        dataType: 'application/json',
        encoding: 'UTF-8',
        payTo: [],
        attachments: [],
        utxos: [],
        useFeeb: DEFAULTS.feeb,
      }
      params = {
        ...initParams,
        ...params,
      }
      const subscribeId = option?.subscribeId || (option?.useQueue ? UUID() : '')
      option = {
        ...initOption,
        ...option,
        subscribeId,
      }
      if (params.payTo && params.payTo.length) {
        params.payTo = params.payTo.filter((item) => item.amount)
      }
      try {
        if (this.appMetaIdJs) {
          await this.checkAppHasMethod('createBrfcChildNode')
          const functionName = `createBrfcChildNode${this.randomString()}`
          const callback: (res: string) => void = (res: any) => {
            this.callback(res, { resolve, reject })
          }
          // @ts-ignore
          window[functionName] = callback
          if (params.loading) delete params.loading
          if (params.attachments!.length > 0) {
            for (let i = 0; i < params.attachments!.length; i++) {
              // @ts-ignore
              params.attachments[i].data = params.attachments[i].hex
            }
          }
          this.appMetaIdJs.createBrfcChildNode(
            userStore.user?.token,
            JSON.stringify(params),
            functionName
          )
        } else {
          //
          let transactions = await this.createBrfcChildNodeTransactions(params)

          let payToRes: CreateNodeBaseRes | undefined = undefined
          if (!params.utxos!.length) {
            //
            let totalAmount = this.getNodeTransactionsAmount(transactions, params.payTo)
            totalAmount += 70000
            const useSatoshis = totalAmount
            //
            if (option.payType === SdkPayType.ME) {
              const meInfo = await GetProtocolMeInfo({
                protocol: params.nodeName,
                address: userStore.user?.address!,
              })
              let useMe = Math.ceil(totalAmount / meInfo.me_rate_amount)
              if (useMe * 100 < meInfo.me_amount_min) useMe = meInfo.me_amount_min / 100
              totalAmount = useMe
            }

            //
            // const balance = await this.getBalance(option.payType!)
            //
            // const result = await this.awitSdkPayconfirm(
            //   option.payType!,
            //   totalAmount,
            //   balance!,
            //   option.checkOnly
            // )
            if (true) {
              //
              //
              let receive = this.getNodeTransactionsFirstReceive(transactions, params)

              //
              const getUtxoRes = await this.getAmountUxto({
                sdkPayType: option.payType!,
                amount: useSatoshis,
                nodeName: params.nodeName,
                receive,
              })

              const currentUtxo = getUtxoRes.utxo
              if (getUtxoRes.payToRes) {
                payToRes = getUtxoRes.payToRes
              }

              //
              transactions = await this.setUtxoForCreateChileNodeTransactions(
                transactions,
                currentUtxo!,
                params,
                //
                option.payType === SdkPayType.ME
                  ? import.meta.env.VITE_CHANGE_ADDRESS
                  : this.wallet!.rootAddress
              )

              //
              if (option.isBroadcast && !option.useQueue) {
                //
                if (payToRes && payToRes.transaction) {
                  await this.wallet?.provider.broadcast(payToRes.transaction.toString())
                }
                //
                await this.broadcastNodeTransactions(transactions)
              }

              resolve({
                payToAddress: payToRes,
                ...transactions,
                subscribeId: option!.subscribeId,
              })

              //
              if (option.useQueue) {
                this.convertTransactionsIntoJob(transactions, payToRes, option!.subscribeId!)
              }
            } else {
              resolve(null)
            }
          } else {
            //

            //
            if (option.isBroadcast) {
              //
              // if (payToRes && payToRes?.transaction) {
              //   await this.wallet?.provider.broadcast(payToRes.transaction.toString())
              // }
              //
              await this.broadcastNodeTransactions(transactions)
            }

            resolve({
              payToAddress: payToRes,
              ...transactions,
            })
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  getOnLinkAppUrl() {
    return import.meta.env.MODE === 'mainnet'
      ? `${import.meta.env.VITE_HOST}`
      : import.meta.env.MODE === 'mainnetgray'
      ? 'gray'
      : import.meta.env.MODE === 'gray'
      ? 'test'
      : 'dev'
  }

  private convertTransactionsIntoJob(
    transactions: NodeTransactions,
    payToRes: CreateNodeBaseRes | undefined,
    subscribeId: string
  ) {
    const jobsStore = useJobsStore()
    const job: Job = {
      id: subscribeId,
      name: 'AReallyNormalJob',
      steps: [],
      status: JobStatus.Waiting,
    }
    const converting: Transaction[] = []

    // A.
    // 1.
    if (payToRes && payToRes.transaction) {
      converting.push(payToRes.transaction)
    }
    // 2.
    if (transactions.metaFileBrfc?.transaction) {
      converting.push(transactions.metaFileBrfc.transaction)
    }
    // 3.
    if (transactions.metaFiles && transactions.metaFiles.length) {
      for (let i = 0; i < transactions.metaFiles.length; i++) {
        converting.push(transactions.metaFiles[i].transaction)
      }
    }
    // 4.
    if (transactions.currentNodeBrfc?.transaction) {
      converting.push(transactions.currentNodeBrfc.transaction)
    }
    // 5.
    if (transactions.currentNode?.transaction) {
      converting.push(transactions.currentNode.transaction)
    }
    // 6.
    if (transactions.nft?.issue?.transaction) {
      converting.push(transactions.nft?.issue?.transaction)
    }

    // B.
    converting.forEach((tx: any) => {
      job.steps.push({
        txId: tx.id,
        txHex: tx.toString(),
        status: JobStepStatus.Waiting,
      })
    })

    // C.
    jobsStore.push(job)
  }

  batchCreateBrfcChildNode(
    params: createBrfcChildNodeParams[],
    option?: {
      isBroadcast?: boolean
      payType?: SdkPayType
      callback?: (params: { index: number; transactions: NodeTransactions }) => Promise<{
        isContinue: boolean
        error?: string
      }>
    }
  ) {
    return new Promise<null | {
      payToRes?: CreateNodeBaseRes
      transactionsList: NodeTransactions[]
    }>(async (resolve, reject) => {
      const initParams = {
        appId: ['ShowV3', this.getOnLinkAppUrl(), this.getPlatform()],
        autoRename: true,
        version: '0.0.9',
        data: 'NULL',
        dataType: 'application/json',
        encoding: 'UTF-8',
        payTo: [],
        attachments: [],
        utxos: [],
        useFeeb: DEFAULTS.feeb,
      }
      const initOption = {
        isBroadcast: true,
        payType: SdkPayType.ME,
      }
      option = {
        ...initOption,
        ...option,
      }

      const userStore = useUserStore()

      // 初始化 参数
      for (let i = 0; i < params.length; i++) {
        params[i] = {
          ...initParams,
          ...params[i],
        }
      }

      const transactionsList: NodeTransactions[] = []

      let payToRes: CreateNodeBaseRes | undefined = undefined
      let payToResIsbBroadcast = false

      //
      let totalAmount = 0 //
      let useSatoshis = 0
      for (let i = 0; i < params.length; i++) {
        const transactions = await this.createBrfcChildNodeTransactions(params[i])
        transactionsList.push(transactions)

        //  +
        totalAmount += this.getNodeTransactionsAmount(transactions, params[i].payTo)
        useSatoshis = totalAmount
      }

      //
      if (option.payType === SdkPayType.ME) {
        const meInfo = await GetProtocolMeInfo({
          protocol: params[0].nodeName,
          address: userStore.user?.address!,
        })
        let useMe = Math.ceil(totalAmount / meInfo.me_rate_amount)
        if (useMe * 100 < meInfo.me_amount_min) useMe = meInfo.me_amount_min / 100
        totalAmount = useMe
      }

      //
      const balance = await this.getBalance(option.payType!)

      //
      const result = await this.awitSdkPayconfirm(option.payType!, totalAmount, balance!)
      if (result) {
        //
        let receive = this.getNodeTransactionsFirstReceive(transactionsList[0], params[0])

        //
        let currentUtxo: UtxoItem
        const getUtxoRes = await this.getAmountUxto({
          sdkPayType: option.payType!,
          amount: useSatoshis,
          nodeName: params[0].nodeName,
          receive,
        })
        currentUtxo = getUtxoRes.utxo
        if (getUtxoRes.payToRes) {
          payToRes = getUtxoRes.payToRes
        }

        let err //

        //
        for (let i = 0; i < transactionsList.length; i++) {
          try {
            //
            const nextNodeReceiveAddress =
              i < transactionsList.length - 1
                ? this.getNodeTransactionsFirstReceive(transactionsList[i + 1], params[i + 1])
                    .address
                : option.payType === SdkPayType.ME
                ? import.meta.env.VITE_CHANGE_ADDRESS
                : this.wallet!.rootAddress
            transactionsList[i] = await this.setUtxoForCreateChileNodeTransactions(
              transactionsList[i],
              currentUtxo!,
              params[i],
              nextNodeReceiveAddress
            )

            //
            if (option.isBroadcast) {
              //
              if (payToRes && payToRes.transaction && !payToResIsbBroadcast) {
                await this.wallet?.provider.broadcast(payToRes.transaction.toString())
                payToResIsbBroadcast = true
              }
              await this.broadcastNodeTransactions(transactionsList[i])
              if (option.callback) {
                const result = await option.callback({
                  index: i,
                  transactions: transactionsList[i],
                })
                if (!result.isContinue) {
                  err = new Error(result.error)
                  break
                }
              }
            }

            if (i !== transactionsList.length - 1) {
              //
              currentUtxo = await this.wallet!.utxoFromTx({
                tx: this.getNodeTransactionsLastTx(transactionsList[i]),
              })
            }
          } catch (error) {
            err = error
          }

          if (err) {
            break
          }
        }

        //
        // if (option.isBroadcast) {
        //   //
        //   if (payToRes && payToRes.transaction) {
        //     await this.wallet?.provider.broadcast(payToRes.transaction.toString())
        //   }
        //   for (let i = 0; i < transactionsList.length; i++) {
        //     await this.broadcastNodeTransactions(transactionsList[i])
        //     if (option.callback) {
        //       const result = await option.callback({
        //         index: i,
        //         transactions: transactionsList[i],
        //       })
        //       if (!result.isContinue) {
        //         error = result.error
        //         break
        //       }
        //     }
        //   }
        // }

        if (err) {
          reject(err)
        } else {
          resolve({
            payToRes: payToRes,
            transactionsList,
          })
        }
      } else {
        resolve(null)
      }
    })
  }

  private createFtTransferTransactions(params: createBrfcChildNodeParams) {
    return new Promise<NodeTransactions>(async (resolve, reject) => {
      try {
        let transactions: NodeTransactions = {}

        if (!transactions.ft) transactions.ft = {}

        let _params: any = {
          utxoMaxCount: 3,
          senderWif: this.wallet!.wallet.deriveChild(0).deriveChild(0).privateKey.toString(),
        }
        _params = {
          ..._params,
          ...JSON.parse(params.data!),
        }

        const ftManager = this.wallet!.getFtManager()
        const FTMergeUtxo = {
          [NodeName.FtTransfer]: 'merge',
        }
        const FtUtxos = {
          [NodeName.FtTransfer]: 'getFtUtxos',
        }
        const ftAccount = await ftManager[FtUtxos[NodeName.FtTransfer]](
          _params.codehash,
          _params.genesis,
          this.wallet!.wallet.deriveChild(0).deriveChild(0).privateKey.toAddress().toString()
        )

        if (ftAccount.length > 30) {
          let mergeParams = {
            codehash: _params.codehash,
            genesis: _params.genesis,
            ownerWif: this.wallet!.wallet.deriveChild(0).deriveChild(0).privateKey.toString(),
            noBroadcast: true,
            changeAddress: this.wallet.rootAddress,
          }
          const mergeRes = await ftManager[FTMergeUtxo[NodeName.FtTransfer]](mergeParams)

          if (mergeRes) {
            await this.wallet?.provider.broadcast(mergeRes.routeCheckTxHex.toString())
            // @ts-ignore
            await this.wallet?.provider.broadcast(mergeRes.txHex.toString())
          }
        }

        const FTGetFeeFunctionName = {
          [NodeName.FtTransfer]: 'getTransferEstimateFee',
        }

        // @ts-ignore
        const feeNumber = await ftManager[FTGetFeeFunctionName[NodeName.FtTransfer]](_params)
        // @ts-ignore

        const res = {
          txId: '',
          transaction: {
            getNeedFee: () => {
              return feeNumber
            },
          },
          scriptPlayload: [],
        }

        // @ts-ignore
        transactions.ft![this.transactionsFTKey[NodeName.FtTransfer]] = res
        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    })
  }

  private createBrfcChildNodeTransactions(params: createBrfcChildNodeParams) {
    return new Promise<NodeTransactions>(async (resolve, reject) => {
      try {
        const userStore = useUserStore()
        const chain = params.payType === SdkPayType.BSV ? HdWalletChain.BSV : HdWalletChain.MVC
        let transactions: NodeTransactions = {}
        if (params.nodeName === NodeName.SendMoney) {
          //
          const scriptPlayload = [import.meta.env.VITE_App_Key]
          const tx = await this.wallet?.makeTx({
            payTo: params.payTo,
            opReturn: [import.meta.env.VITE_App_Key],
            utxos: params.utxos,
            chain: chain,
          })
          if (tx) {
            transactions.sendMoney = {
              txId: tx.id,
              transaction: tx,
              scriptPlayload: scriptPlayload,
            }
          }
        } else if (this.isInfoNode(params.nodeName)) {
          //

          const res = await this.wallet?.createNode({
            ...params,
            parentTxId: userStore.user!.infoTxId,
            chain,
          })
          transactions.currentNode = res
        } else {
          //

          //
          //   if (params.attachments && params.attachments!.length > 0) {
          //     transactions.metaFileBrfc = await this.getBrfcNode(
          //       {
          //         nodeName: NodeName.MetaFile,
          //         parentTxId: userStore.user?.protocolTxId!,
          //         utxos: [],
          //         useFeeb: params.useFeeb,
          //       },
          //       {
          //         isBroadcast: false,
          //         chain,
          //       }
          //     )
          //     transactions.metaFiles = await this.createMetaFilesTransactions(
          //       transactions.metaFileBrfc!.txId,
          //       params.attachments,
          //       chain
          //     )
          //   }

          //
          if (params.nodeName !== NodeName.MetaFile) {
            //
            if (params.publickey && params.txId) {
              //
              const res = await GetTx(params.txId)
              if (res.code === 0) {
                const protocol = await this.wallet!.getProtocolInfo(
                  params.nodeName,
                  res.data.parentTxId,
                  res.data.parentData,
                  chain
                )
                transactions.currentNodeBrfc = {
                  address: res.data.parentAddress,
                  txId: res.data.parentTxId,
                  addressType: protocol!.addressType,
                  addressIndex: protocol!.addressIndex,
                }
              }
            } else {
              //
              transactions.currentNodeBrfc = await this.getBrfcNode(
                {
                  nodeName: params.nodeName,
                  parentTxId: userStore.user?.protocolTxId!,
                  utxos: params.utxos,
                  useFeeb: params.useFeeb,
                },
                { isBroadcast: false, chain }
              )
            }

            const createCurrentNodeParams = {
              ...params,
              publickey: params.publickey,
              brfcTxId: transactions.currentNodeBrfc!.txId,
              ...AllNodeName[params.nodeName as NodeName]!,
            }

            if (params.nodeName === NodeName.FtTransfer) {
              if (!transactions.ft) transactions.ft = {}
              const scriptPlayload = await this.getScriptPlayload(createCurrentNodeParams, chain)
              let _params = {
                opreturnData: scriptPlayload!,
                utxoMaxCount: 3,
                senderWif: this.wallet!.wallet.deriveChild(0).deriveChild(0).privateKey.toString(),
              }

              _params = {
                ..._params,
                ...JSON.parse(params.data!),
              }
              const ftManager = this.wallet!.getFtManager()
              const FTGetFeeFunctionName = {
                [NodeName.FtTransfer]: 'getTransferEstimateFee',
              }
              // @ts-ignore
              const feeNumber = await ftManager[FTGetFeeFunctionName[params.nodeName]](_params)
              // @ts-ignore

              const res = {
                txId: '',
                transaction: {
                  getNeedFee: () => {
                    return feeNumber
                  },
                },
                scriptPlayload: [],
              }

              // @ts-ignore
              transactions.ft![this.transactionsFTKey[params.nodeName]] = res
            } else {
              transactions.currentNode = await this.wallet?.createBrfcChildNode(
                createCurrentNodeParams,
                {
                  isBroadcast: false,
                  chain,
                }
              )
            }
          }
        }

        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    })
  }

  private getBrfcNode(
    params: CreateBrfcNodePrams,
    option?: { isBroadcast?: boolean; chain?: HdWalletChain }
  ) {
    return new Promise<CreateNodeBrfcRes>(async (resolve, reject) => {
      try {
        if (this.bfrcNodeList.some((item) => item.nodeName === params.nodeName)) {
          resolve(this.bfrcNodeList.find((item) => item.nodeName === params.nodeName)!.data)
        } else {
          const currentNodeBrfc = await this.wallet?.createBrfcNode(params, option)
          this.bfrcNodeList.push({
            nodeName: params.nodeName,
            data: {
              ...currentNodeBrfc!,
              transaction: undefined,
            },
          })
          resolve(currentNodeBrfc!)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private getNodeTransactionsFirstReceive(
    transactions: NodeTransactions,
    params: createBrfcChildNodeParams
  ) {
    //
    let receive: {
      address: string
      addressIndex: number
      addressType: number
    }
    if (this.isInfoNode(NodeName.Name)) {
      receive = {
        address: this.wallet!.infoAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Info'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Info'].keyPath.split('/')[1]),
      }
    }
    if (transactions.sendMoney?.transaction) {
      receive = {
        address: this.wallet!.rootAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
      }
    } else if (transactions.metaFileBrfc?.transaction) {
      //
      receive = {
        address: this.wallet!.protocolAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[1]),
      }
    } else if (transactions.metaFiles && transactions.metaFiles.length) {
      //
      receive = {
        address: transactions.metaFileBrfc!.address,
        addressType: transactions.metaFileBrfc!.addressType,
        addressIndex: transactions.metaFileBrfc!.addressIndex,
      }
    } else if (transactions.currentNodeBrfc?.transaction) {
      //
      receive = {
        address: this.wallet!.protocolAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[1]),
      }
    } else {
      receive = {
        address: transactions.currentNodeBrfc!.address,
        addressType: transactions.currentNodeBrfc!.addressType,
        addressIndex: transactions.currentNodeBrfc!.addressIndex,
      }
    }
    return receive
  }

  private getScriptPlayload(params: HdWalletCreateBrfcChildNodeParams, chain = HdWalletChain.MVC) {
    return new Promise<(string | Buffer)[]>(async (resolve, reject) => {
      const res = await this.wallet
        ?.createBrfcChildNode(params, {
          isBroadcast: false,
          chain,
        })
        .catch((error) => {
          reject(error)
        })
      if (res) {
        resolve(res.scriptPlayload!)
      }
    })
  }

  private setUtxoForTransferFtTransactions(
    transactions: NodeTransactions,
    utxo: UtxoItem,
    params: createBrfcChildNodeParams,
    lastChangeAddress: string
  ) {
    return new Promise<NodeTransactions>(async (resolve, reject) => {
      try {
        const ftManager = this.wallet!.getFtManager()

        const _params = {
          ...JSON.parse(params.data!),
          opreturnData: '',
          noBroadcast: true,
          utxos: [utxo],
          senderWif: this.wallet!.wallet.deriveChild(0).deriveChild(0).privateKey.toString(),
          changeAddress: lastChangeAddress,
        }
        const FTOperateFunName = {
          ...this.transactionsFTKey,
        }
        // @ts-ignore
        const res = await ftManager![FTOperateFunName[params.nodeName]](_params).catch((e: any) => {
          console.log('e', e.toString())
        })

        if (res && typeof res !== 'number') {
          if (params.nodeName === NodeName.FtTransfer) {
            // @ts-ignore
            transactions.ft!.transfer!.checkTransaction = res.routeCheckTx
            transactions.ft!.transfer!.checkTxId = res.routeCheckTx.id
            transactions.ft!.transfer!.transaction = res.tx
            transactions.ft!.transfer!.txId = res.tx.id
          }
        }

        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    })
  }

  private setUtxoForCreateChileNodeTransactions(
    transactions: NodeTransactions,
    utxo: UtxoItem,
    params: createBrfcChildNodeParams,
    lastChangeAddress: string
  ) {
    return new Promise<NodeTransactions>(async (resolve, reject) => {
      try {
        const chain = params.payType === SdkPayType.BSV ? HdWalletChain.BSV : HdWalletChain.MVC
        if (params.nodeName === NodeName.SendMoney) {
          this.setTransferUtxoAndOutputAndSign(
            transactions.sendMoney!.transaction,
            [utxo],
            lastChangeAddress
          )
          transactions.sendMoney.txId = transactions.sendMoney.transaction.id
        } else if (this.isInfoNode(params.nodeName)) {
          this.setTransferUtxoAndOutputAndSign(
            transactions.currentNode!.transaction,
            [utxo],
            lastChangeAddress
          )
          //

          transactions.currentNode!.txId = transactions.currentNode!.transaction.id
        } else {
          //   if (transactions.metaFileBrfc?.transaction) {
          //     this.setTransferUtxoAndOutputAndSign(
          //       transactions.metaFileBrfc.transaction,
          //       [utxo],
          //       transactions.metaFileBrfc.address
          //     )
          //     //
          //     transactions.metaFileBrfc.txId = transactions.metaFileBrfc.transaction.id
          //     //
          //     this.updateBfrcNodeList(NodeName.MetaFile, transactions.metaFileBrfc)

          //     //
          //     utxo = await this.wallet!.utxoFromTx({
          //       tx: transactions.metaFileBrfc.transaction,
          //       chain,
          //     })

          //     //
          //     transactions.metaFiles!.length = 0
          //     //
          //     for (const item of params.attachments!) {
          //       const index = this.metaFileSha256TxIdList.findIndex(
          //         (_item) => _item.sha256 === item.sha256
          //       )
          //       if (index > -1) {
          //         this.metaFileSha256TxIdList.splice(index, 1)
          //       }
          //     }
          //     transactions.metaFiles = await this.createMetaFilesTransactions(
          //       transactions.metaFileBrfc!.txId,
          //       params.attachments,
          //       chain
          //     )
          //   }

          //   if (transactions.metaFiles && transactions.metaFiles.length) {
          //     const metaFileTransactions = transactions.metaFiles.filter((item) => item.transaction)
          //     for (let i = 0; i < metaFileTransactions.length; i++) {
          //       const changeAddress =
          //         i < metaFileTransactions.length - 1
          //           ? transactions.metaFileBrfc!.address
          //           : transactions.currentNodeBrfc?.transaction
          //           ? this.wallet!.protocolAddress
          //           : transactions.currentNode?.transaction ||
          //             transactions.nft?.genesis?.transaction ||
          //             transactions.nft?.transfer?.transaction
          //           ? transactions.currentNodeBrfc!.address
          //           : lastChangeAddress
          //       this.setTransferUtxoAndOutputAndSign(
          //         metaFileTransactions[i].transaction,
          //         [utxo],
          //         //
          //         changeAddress
          //       )
          //       //
          //       metaFileTransactions[i].txId = metaFileTransactions[i].transaction.id
          //       //
          //       const metaFileSha256Index = this.metaFileSha256TxIdList.findIndex(
          //         (_item) => _item.sha256 === metaFileTransactions[i].sha256
          //       )
          //       if (metaFileSha256Index > -1) {
          //         this.metaFileSha256TxIdList[metaFileSha256Index].txId = metaFileTransactions[i].txId
          //       }

          //       //
          //       const addressInfo: any = {}
          //       if (i < metaFileTransactions.length - 1) {
          //         addressInfo.addressIndex = transactions.metaFileBrfc!.addressIndex
          //         addressInfo.addressType = transactions.metaFileBrfc!.addressType
          //       } else if (transactions.currentNodeBrfc?.transaction) {
          //         addressInfo.addressType = parseInt(
          //           this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]
          //         )
          //         addressInfo.addressIndex = parseInt(
          //           this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[1]
          //         )
          //       } else if (
          //         transactions.nft?.issue?.transaction ||
          //         transactions.currentNode?.transaction
          //       ) {
          //         addressInfo.addressIndex = transactions.currentNodeBrfc!.addressIndex
          //         addressInfo.addressType = transactions.currentNodeBrfc!.addressType
          //       }
          //       utxo = await this.wallet!.utxoFromTx({
          //         tx: metaFileTransactions[i].transaction,
          //         addressInfo,
          //         chain,
          //         // addressInfo: {
          //         //   addressIndex: transactions.metaFileBrfc!.addressIndex,
          //         //   addressType: transactions.metaFileBrfc!.addressType,
          //         // },
          //       })
          //     }

          //     //
          //     for (let i = 0; i < transactions.metaFiles.length; i++) {
          //       if (!transactions.metaFiles[i].transaction) {
          //         const index = this.metaFileSha256TxIdList.findIndex(
          //           (item) => item.sha256 === transactions.metaFiles![i].sha256
          //         )
          //         if (index > -1) {
          //           transactions.metaFiles[i].txId = this.metaFileSha256TxIdList[index].txId
          //         }
          //       }
          //     }
          //   }

          if (params.nodeName !== NodeName.MetaFile) {
            if (transactions.currentNodeBrfc?.transaction) {
              this.setTransferUtxoAndOutputAndSign(
                transactions.currentNodeBrfc.transaction,
                [utxo],
                transactions.currentNodeBrfc.address
              )
              //
              transactions.currentNodeBrfc.txId = transactions.currentNodeBrfc.transaction.id
              //
              this.updateBfrcNodeList(params.nodeName, transactions.currentNodeBrfc)

              //
              utxo = await this.wallet!.utxoFromTx({
                tx: transactions.currentNodeBrfc!.transaction,
                chain,
              })
            }

            //
            if (transactions.metaFiles && transactions.metaFiles.length) {
              for (let i = 0; i < transactions.metaFiles.length; i++) {
                const fileSuffix =
                  params.attachments![i].fileName.split('.')[
                    params.attachments![i].fileName.split('.').length - 1
                  ]
                params.data = params.data!.replaceAll(
                  `$[${i}]`,
                  `${transactions.metaFiles[i].txId}.${fileSuffix}`
                )
              }
            }

            const createCurrentNodeParams = {
              ...params,
              brfcTxId: transactions.currentNodeBrfc!.txId!,
              ...AllNodeName[params.nodeName as NodeName]!,
            }

            if (params.nodeName === NodeName.FtTransfer) {
              const scriptPlayload = await this.getScriptPlayload(createCurrentNodeParams, chain)
              const ftManager = this.wallet!.getFtManager()

              const _params = {
                ...JSON.parse(params.data!),
                opreturnData: scriptPlayload,
                noBroadcast: true,
                utxos: [utxo],
                senderWif: this.wallet!.wallet.deriveChild(0).deriveChild(0).privateKey.toString(),

                changeAddress: lastChangeAddress,
              }
              const FTOperateFunName = {
                ...this.transactionsFTKey,
              }
              // @ts-ignore
              const res = await ftManager!
                [FTOperateFunName[params.nodeName]](_params)
                .catch((e: any) => {
                  console.log('e', e.toString())
                })

              if (res && typeof res !== 'number') {
                if (params.nodeName === NodeName.FtTransfer) {
                  // @ts-ignore
                  transactions.ft!.transfer!.checkTransaction = res.routeCheckTx
                  transactions.ft!.transfer!.checkTxId = res.routeCheckTx.id
                  transactions.ft!.transfer!.transaction = res.tx
                  transactions.ft!.transfer!.txId = res.tx.id
                }
              }
            } else {
              const res = await this.wallet?.createBrfcChildNode(
                // @ts-ignore
                createCurrentNodeParams,
                {
                  isBroadcast: false,
                  chain,
                }
              )
              if (res) transactions.currentNode = res

              this.setTransferUtxoAndOutputAndSign(
                transactions.currentNode.transaction,
                [utxo],
                params.nodeName === NodeName.NftIssue ? this.wallet!.rootAddress : lastChangeAddress
              )
              console.log('currentNode', utxo)
              //
              transactions.currentNode.txId = transactions.currentNode.transaction.id

              //    if (params.nodeName === NodeName.NftIssue) {
              //      //
              //      utxo = await this.wallet!.utxoFromTx({
              //        tx: transactions.currentNode!.transaction,
              //        chain,
              //      })
              //      console.log('NftIssue', utxo)
              //      const data = JSON.parse(params.data!)
              //      const nftManager = this.wallet!.getNftManager()
              //      const res = await nftManager!.mint({
              //        sensibleId: data.sensibleId,
              //        metaTxId: transactions.currentNode.txId,
              //        noBroadcast: true,
              //        metaOutputIndex: 0,
              //        utxos: [utxo],
              //        changeAddress: lastChangeAddress,
              //      })
              //      if (res) {
              //        transactions.nft!.issue = {
              //          tokenIndex: res.tokenIndex!,
              //          transaction: res.tx,
              //          // @ts-ignore
              //          txId: res!.txid!,
              //        }
              //      }
              //    }
            }
          }
        }

        //
        if (params.payType === SdkPayType.BSV && transactions?.nft) {
          for (let i in transactions.nft) {
            // @ts-ignore
            if (transactions.nft[i].transaction) {
              // @ts-ignore
              transactions.nft[i].transaction.version = WalletTxVersion.BSV
              // @ts-ignore
              transactions.nft[i].id = transactions.nft[i].transaction.id
            }
          }
        }

        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    })
  }

  //
  private updateBfrcNodeList(nodeName: NodeName, nodeInfo: CreateNodeBrfcRes) {
    const index = this.bfrcNodeList.findIndex((item) => item.nodeName === nodeName)
    if (index !== -1) {
      this.bfrcNodeList[index].data = {
        ...nodeInfo,
        transaction: undefined,
      }
    }
  }

  private broadcastNodeTransactions(transactions: NodeTransactions) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        //
        if (transactions.sendMoney?.transaction) {
          await this.wallet?.provider.broadcast(transactions.sendMoney.transaction.toString())
        }
        //
        if (transactions.metaFileBrfc?.transaction) {
          await this.wallet?.provider.broadcast(transactions.metaFileBrfc.transaction.toString())
        }
        //
        if (transactions.metaFiles && transactions.metaFiles.length) {
          let catchError
          for (
            let i = 0;
            i < transactions.metaFiles.filter((item) => item.transaction).length;
            i++
          ) {
            try {
              await this.wallet?.provider.broadcast(
                transactions.metaFiles[i].transaction.toString()
              )
            } catch (error) {
              catchError = (error as any).message
              break
            }
          }
          if (catchError) {
            throw new Error(catchError)
          }
        }
        //

        if (transactions.currentNodeBrfc?.transaction) {
          await this.wallet?.provider.broadcast(transactions.currentNodeBrfc.transaction.toString())
        }
        //
        if (transactions.currentNode?.transaction) {
          await this.wallet?.provider.broadcast(transactions.currentNode.transaction.toString())
          // if (
          //   transactions.currentNode?.transaction.addressIndex != -1 &&
          //   transactions.currentNode?.transaction.addressType != -1
          // ) {

          // }
        }

        //
        if (transactions.nft) {
          for (let i in transactions.nft) {
            if (i === 'sell') {
              //
              await this.wallet?.provider.broadcast(transactions.nft[i]?.sellTransaction.toString())
            } else if (i === 'buy' || i === 'cancel') {
              //
              await this.wallet?.provider.broadcast(
                transactions.nft[i]!.unlockCheckTransaction.toString()
              )
            }

            // @ts-ignore
            await this.wallet?.provider.broadcast(transactions.nft[i].transaction.toString())
          }
        }
        if (transactions.ft) {
          for (let i in transactions.ft) {
            if (i === 'transfer') {
              await this.wallet?.provider.broadcast(
                transactions.ft.transfer?.checkTransaction.toString()
              )
            }
            // @ts-ignore
            await this.wallet?.provider.broadcast(transactions.ft![i].transaction.toString())
          }
        }
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  private getNodeTransactionsAmount(transactions: NodeTransactions, payTo: PayToItem[] = []) {
    let amount = 0
    //
    //
    if (transactions.sendMoney?.transaction) {
      amount += mvc.Transaction.DUST_AMOUNT + mvc.Transaction.DUST_AMOUNT
    }
    if (transactions.metaFileBrfc?.transaction)
      amount += transactions.metaFileBrfc.transaction.getNeedFee()
    //
    if (transactions.metaFiles && transactions.metaFiles.length > 0) {
      for (const item of transactions.metaFiles.filter((item) => item.transaction)) {
        amount += item.transaction.getNeedFee()
      }
    }
    //
    if (transactions.currentNodeBrfc?.transaction)
      amount += transactions.currentNodeBrfc.transaction.getNeedFee()
    //
    if (transactions.currentNode?.transaction)
      amount += transactions.currentNode.transaction.getNeedFee()

    if (transactions.nft) {
      for (let i in transactions.nft) {
        // @ts-ignore
        amount += transactions.nft[i].transaction.getNeedFee()
      }
    }
    if (transactions.ft) {
      for (let i in transactions.ft) {
        // @ts-ignore

        amount += transactions.ft[i].transaction.getNeedFee()
      }
    }
    if (payTo && payTo.length > 0) {
      // payTo 价格
      for (const item of payTo) {
        amount += item.amount
      }
    }

    return amount
  }

  private getBalance(type: SdkPayType) {
    return new Promise<number>(async (resolve, reject) => {
      try {
        let balance = 0
        const userStore = useUserStore()
        if (type === SdkPayType.SPACE) {
          //
          //
          const res = await this.wallet?.provider.getXpubBalance(
            this.wallet.wallet.xpubkey.toString()
          )
          if (typeof res === 'number') balance = res
        } else if (type === SdkPayType.ME) {
          const userMeRes = await GetMyMEBalance({
            address: userStore.user?.address!,
          })
          if (userMeRes.code === 0) {
            balance = userMeRes.data.count / 100
          }
        } else if (type === SdkPayType.BSV) {
          const res = await this.wallet?.provider.getXpubBalance(
            this.wallet.wallet.xpubkey.toString(),
            HdWalletChain.BSV
          )
          if (typeof res === 'number') balance = res
        }
        resolve(balance)
      } catch (error) {
        reject(error)
      }
    })
  }

  getAmountUxto(params: {
    sdkPayType: SdkPayType
    amount: number
    nodeName?: NodeName
    receive: {
      address: string
      addressType: number
      addressIndex: number
    }
  }) {
    return new Promise<{
      utxo: UtxoItem
      payToRes?: CreateNodeBaseRes
    }>(async (resolve, reject) => {
      const userStore = useUserStore()
      let utxo: UtxoItem
      let payToRes: CreateNodeBaseRes | undefined = undefined
      try {
        if (params.sdkPayType === SdkPayType.SPACE || params.sdkPayType === SdkPayType.BSV) {
          const chain = params.sdkPayType === SdkPayType.BSV ? HdWalletChain.BSV : HdWalletChain.MVC
          const allUtxos = await this.wallet?.provider.getUtxos(
            this.wallet.wallet.xpubkey.toString(),
            chain
          )

          const useUtxos = []
          if (allUtxos && allUtxos?.length > 0) {
            //
            let leftAmount = params.amount + mvc.Transaction.DUST_AMOUNT
            for (let i = 0; i < allUtxos.length; i++) {
              if (leftAmount > 0) {
                useUtxos.push(allUtxos[i])
                leftAmount -= allUtxos[i].satoshis
              } else {
                break
              }
            }
            if (leftAmount > 0) {
              // @ts-ignore
              throw new Error(`Insufficient balance`)
            } else {
              const res = await this.wallet?.makeTx({
                utxos: useUtxos,
                opReturn: [],
                change: this.wallet.rootAddress,
                payTo: [
                  {
                    amount: params.amount,
                    address: params.receive.address,
                  },
                ],
                chain,
              })
              if (res) {
                payToRes = {
                  transaction: res,
                  txId: res.id,
                }
                utxo = await this.wallet!.utxoFromTx({
                  tx: payToRes.transaction,
                  outPutIndex: 0,
                  chain,
                })
              }
            }
          }
        } else {
          const getMeUtxo = await GetMeUtxos({
            address: userStore.user!.address,
            amount: params.amount,
            meta_id: userStore.user!.metaId,
            protocol: params.nodeName,
            //
            receive_address: params.receive.address,
          })
          if (getMeUtxo.code === 0) {
            utxo = {
              address: getMeUtxo.data.address,
              //
              addressIndex: params.receive.addressIndex,
              addressType: params.receive!.addressType,
              outputIndex: 0,
              txId: getMeUtxo.data.tx,
              xpub: this.wallet!.wallet.xpubkey.toString(),
              script: getMeUtxo.data.script,
              satoshis: getMeUtxo.data.amount,
              amount: getMeUtxo.data.amount / 1e8,
              wif: this.getPathPrivateKey(
                `${params.receive!.addressType}/${params.receive!.addressIndex}`
              )!.toString(),
            }
          }
        }
        resolve({
          utxo: utxo!,
          payToRes: payToRes,
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  private awitSdkPayconfirm(
    payType: SdkPayType,
    useAmount: number,
    balance: number,
    checkOnly: boolean = false
  ) {
    return new Promise<boolean>((resolve, reject) => {
      const userStore = useUserStore()
      if (
        !checkOnly &&
        (userStore.sdkPayConfirm[payType].visible ||
          (!userStore.sdkPayConfirm[payType].visible &&
            userStore.sdkPayConfirm[payType].value < useAmount))
      ) {
        //
        const divId = `sdk-pay-conirm-${new Date().getTime()}`
        const div = document.createElement('div')
        div.id = divId
        document.body.append(div)
        render(
          // @ts-ignore
          h('div', {
            confirmVisible: userStore.sdkPayConfirm[payType].visible,
            useAmount,
            maxCount: userStore.sdkPayConfirm[payType].value,
            balance,
            router,
            payType,
            onChangeConfirmVisible: (res: boolean) => {
              userStore.changeSdkPayConfirm('visible', res, payType)
            },
            onConfirm: () => {
              setTimeout(() => {
                document.getElementById(divId)?.remove()
              }, 500)
              resolve(true)
            },
            onCancel: () => {
              setTimeout(() => {
                document.getElementById(divId)?.remove()
              }, 500)
              resolve(false)
            },
            onRecharge: () => {
              setTimeout(() => {
                document.getElementById(divId)?.remove()
              }, 500)
              resolve(false)
              //   const layout = useLayoutStore()
              //   layout.$patch({ isShowWallet: true })
            },
          }),
          document.getElementById(divId)!
        )
      } else {
        //
        resolve(true)
      }
    })
  }

  private getNodeTransactionsLastTx(transactions: NodeTransactions) {
    if (transactions.sendMoney?.transaction) {
      return transactions.sendMoney?.transaction
    } else if (transactions.nft) {
      if (transactions.nft.genesis) {
        return transactions.nft?.genesis?.transaction
      } else if (transactions.nft.transfer) {
        return transactions.nft?.transfer?.transaction
      } else if (transactions.nft.issue) {
        return transactions.nft?.issue?.transaction
      }
    } else if (transactions.currentNode?.transaction) {
      return transactions.currentNode?.transaction
    } else if (transactions.currentNodeBrfc?.transaction) {
      return transactions.currentNodeBrfc?.transaction
    } else if (transactions.metaFiles && transactions.metaFiles.length) {
      return transactions.metaFiles[transactions.metaFiles.length - 1].transaction
    } else if (transactions.metaFileBrfc?.transaction) {
      return transactions.metaFileBrfc?.transaction
    }
  }

  getPlatform() {
    return isIosApp
      ? 'iosApp'
      : isIOS
      ? 'ios:web'
      : isAndroidApp
      ? 'androidApp'
      : isAndroid
      ? 'android:web'
      : 'web'
  }

  //
  toLogin(fullpath: string) {
    if (this.appMetaIdJs) {
      this.appMetaIdJs.needLogin('', '', '')
    } else {
      router.push({
        name: 'preLogin',
        query: {
          redirect: fullpath,
        },
      })
    }
  }

  setTransferUtxoAndOutputAndSign(
    tx: bsv.Transaction,
    utxos: UtxoItem[],
    changeAddress: string,
    useFeeb = DEFAULTS.feeb
  ) {
    tx.from(utxos)
    // @ts-ignore
    // if (tx.isNeedChange()) {
    // }

    tx.change(changeAddress)
    // @ts-ignore
    tx.fee(Math.ceil(tx._estimateSize() * useFeeb))

    // @ts-ignore
    // if (tx.isNeedChange()) {
    //   // tx.change(changeAddress)
    //   tx.addOutput(
    //     new bsv.Transaction.Output({
    //       // satoshis: Math.floor(
    //       //   brfcChildTransaction._getUnspentValue() -
    //       //     // @ts-ignore
    //       //     brfc.transaction.getNeedFee()
    //       // ),
    //       // @ts-ignore
    //       satoshis: tx.getChangeAmount(),
    //       script: bsv.Script.fromAddress(changeAddress),
    //     })
    //   )
    // }
    const privateKeys = this.wallet!.getUtxosPrivateKeys(utxos)
    // @ts-ignore
    tx.sign(privateKeys)
  }

  /**
   * ECIES
   */
  eciesDecryptData(params: {
    data: string | Buffer
    privateKey?: mvc.PrivateKey | string
    publicKey?: string
  }) {
    return new Promise<string>(async (resolve, reject) => {
      if (this.appMetaIdJs) {
        await this.checkAppHasMethod('eciesDecryptData')
        const callback = (res: MetaIdJsRes) => {
          this.callback(res, { reject, resolve })
        }
        const callbackName = 'eciesDecryptDataCallback'
        // @ts-ignore
        window[callbackName] = callback
        const userStore = useUserStore()
        this.appMetaIdJs.eciesDecryptData(
          userStore.user?.token,
          JSON.stringify(params),
          callbackName
        )
      } else {
        const result = this.wallet!.eciesDecryptData(
          params.data,
          // @ts-ignore
          params.privateKey,
          params.publicKey
        )
        resolve(result)
      }
    })
  }

  getPathWithNetWork(params: { xpub: string; address: string }) {
    return this.wallet?.provider.getPathWithNetWork(params)
  }

  getPathPrivateKey(path: string) {
    return this.wallet?.getPathPrivateKey(path)
  }

  isFTProtocol(nodeName: NodeName) {
    const nfts = [NodeName.FtGenesis, NodeName.FtIssue, NodeName.NftSell]
    if (nfts.includes(nodeName)) {
      return true
    } else {
      return false
    }
  }

  ftGenesis() {
    return this.wallet?.ftGenesis()
  }

  async sendMoney(payTo: Array<{ amount: number; address: string }>) {
    const Utxos = await this.wallet?.provider.getUtxos(this.wallet.wallet.xpubkey.toString())
    if (!Utxos.length) {
      throw new Error(`Utxo is empty`)
    }
    const res = await this.wallet?.makeTx({
      utxos: Utxos,
      opReturn: [],
      change: this.wallet.rootAddress,
      payTo: payTo,
    })

    return await this.wallet?.provider.broadcast(res!.toString())
  }

  ftTransfer(
    params: {
      receivers: {
        address: string
        amount: string
      }
      codehash: string
      genesis: string
      utxos?: any[]
    },
    option?: {
      isBroadcast: boolean
    }
  ) {
    return new Promise<{
      txHex: string
      txid: string
      tx: mvc.Transaction
    }>(async (resolve, reject) => {
      try {
        //await this.checkSdkStatus()
        const res = await this.wallet?.ftTransfer(params, option)
        // @ts-ignore
        if (res) resolve(res)
      } catch (error) {
        reject(error)
      }
    })
  }

  isInfoNode(nodeName: NodeName) {
    const target = AllNodeName[nodeName]
    if (target) {
      if (target.path === 'info') {
        return true
      } else {
        false
      }
    } else {
      // @ts-ignore
      throw new Error('Not Found Node Name' + ':' + nodeName)
    }
  }
}

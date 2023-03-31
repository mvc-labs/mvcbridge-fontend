import { defineStore } from 'pinia'
import { reportTask } from '@/api/metaid-base'
import { JobStatus, JobStepStatus } from '@/enum'
import { sleep } from '@/utils/util'

export const useJobsStore = defineStore('jobs', {
  state: () => {
    return {
      jobsQueue: [] as Job[], // 任务队列
      waitingNotify: [] as Job[], // 已上报，等待结果的任务

      done: [] as Job[], // 已完成的任务
      failed: [] as Job[], // 失败的任务
      // processing: null as Generator<any> | null,
      // nodes: [] as any,

      isRunning: false,
    }
  },

  getters: {
    hasJobs(state) {
      return state.jobsQueue.length
    },

    justGotSuccess(state) {
      return state.waitingNotify.filter((job) => job.status === JobStatus.Success).length
    },

    hasWaiting(state) {
      return state.waitingNotify.filter((job) => job.status === JobStatus.Waiting).length
    },

    hasFailed(state) {
      return state.waitingNotify.filter((job) => job.status === JobStatus.Failed).length
    },

    hasUnresolved() {
      return this.hasJobs || this.hasWaiting || this.hasFailed || this.justGotSuccess
    },
  },

  actions: {
    push(job: Job) {
      this.jobsQueue.push(job)
      if (!this.isRunning) {
        this.run()
      }
    },

    async run() {
      this.isRunning = true
      while (this.hasJobs) {
        await this.runOnce()
      }
      this.isRunning = false
    },

    async runOnce() {
      if (this.hasJobs) {
        const job = this.jobsQueue[0]

        // 上报节点
        await this.report(job)

        // 上报成功，将任务移入 waitingNotify
        this.waitingNotify.push(job)
        this.jobsQueue.shift()
      }
    },

    async report(job: Job) {
      const body = {
        id: job.id,
        list: [] as any[],
      }
      job.steps.forEach((step: JobStep) => {
        body.list.push({
          hex: step.txHex,
          txId: step.txId,
        })
      })

      const res = await reportTask(body)
    },

    // 处理WS消息，更新Job状态
    async handleWsMessage(message: any) {
      // 在 waitingNotify 队列中找到该任务
      const job = this.waitingNotify.find((j) => j.id === message.id)
      if (job) {
        // 更新任务步骤状态
        // 步骤的成功状态判定：拥有resultTxId的步骤为成功
        for (let i = 0; i < job.steps.length; i++) {
          const step = job.steps[i]
          const stepInMessage = message.list[i]
          step.metanetId = stepInMessage.resultMetanetId
          step.status = stepInMessage.resultTxId ? JobStepStatus.Success : JobStepStatus.Failed
        }

        // 更新任务状态
        // 所有步骤成功，任务成功；否则任务失败
        const isSuccessful = job.steps.every((step) => step.status === JobStepStatus.Success)
        job.status = isSuccessful ? JobStatus.Success : JobStatus.Failed

        // 如果任务失败，等待一段时间后，将任务移出 waitingNotify，并添加至 failed 队列
        if (job.status === JobStatus.Failed) {
          sleep(3000).then(() => {
            this.failed.push(job)
            this.waitingNotify.splice(this.waitingNotify.indexOf(job), 1)
          })
        } else if (job.status === JobStatus.Success) {
          // 如果任务成功，将任务移出 waitingNotify
          sleep(3000).then(() => {
            this.done.push(job)
            this.waitingNotify.splice(this.waitingNotify.indexOf(job), 1)
          })
        }
      }
    },
  },
})

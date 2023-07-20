import { defineStore } from 'pinia'
import { reportTask } from '@/api/metaid-base'
import { JobStatus, JobStepStatus } from '@/enum'
import { sleep } from '@/utils/util'

export const useJobsStore = defineStore('jobs', {
  state: () => {
    return {
      jobsQueue: [] as Job[], //
      waitingNotify: [] as Job[], //

      done: [] as Job[], //
      failed: [] as Job[], //
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

        //
        await this.report(job)

        //
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

    //
    async handleWsMessage(message: any) {
      // 在 waitingNotify 队列中找到该任务
      const job = this.waitingNotify.find((j) => j.id === message.id)
      if (job) {
        //
        //
        for (let i = 0; i < job.steps.length; i++) {
          const step = job.steps[i]
          const stepInMessage = message.list[i]
          step.metanetId = stepInMessage.resultMetanetId
          step.status = stepInMessage.resultTxId ? JobStepStatus.Success : JobStepStatus.Failed
        }

        //
        //
        const isSuccessful = job.steps.every((step) => step.status === JobStepStatus.Success)
        job.status = isSuccessful ? JobStatus.Success : JobStatus.Failed

        //
        if (job.status === JobStatus.Failed) {
          sleep(3000).then(() => {
            this.failed.push(job)
            this.waitingNotify.splice(this.waitingNotify.indexOf(job), 1)
          })
        } else if (job.status === JobStatus.Success) {
          //
          sleep(3000).then(() => {
            this.done.push(job)
            this.waitingNotify.splice(this.waitingNotify.indexOf(job), 1)
          })
        }
      }
    },
  },
})

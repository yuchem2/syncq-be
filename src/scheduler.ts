import fastq, { queueAsPromised } from 'fastq'
import schedule from 'node-schedule'

import { sendMessage } from '@/bot'
import { getNowUTCTime, logger } from '@/utils'
import { TimerModel } from '@/models/timer'

export default class Scheduler {
    queue: queueAsPromised

    constructor() {
        this.queue = fastq.promise(sendMessage, 100)
    }

    private async publish() {
        const now = getNowUTCTime()
        let page = 1
        while (page) {
            const timersToSend = await TimerModel.findByExecutionTime(page, now)
            for (const timer of timersToSend.docs) {
                this.queue.push(timer)
            }
            page = timersToSend.nextPage
        }
    }

    public run() {
        schedule.scheduleJob('* * * * *', async () => {
            try {
                await this.publish()
            } catch (e) {
                logger.error('scheduler fail', { error: e })
            }
        })
    }

    public async stop() {
        await schedule.gracefulShutdown()
        await this.queue.drained()
    }
}

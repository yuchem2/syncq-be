import API from '@/api'
import connect, { close } from '@/models/connector'
import { botStartup, botStop } from '@/bot'
import Scheduler from '@/scheduler'
import { logger } from '@/utils'
;(async () => {
    await connect()
    const api = new API()
    const scheduler = new Scheduler()
    api.listen()
    await botStartup()
    scheduler.run()

    async function shutdown() {
        logger.info('gracefully shutdown syncQ')
        await Promise.all([api.close, scheduler.stop, botStop()])
        await close()
        logger.info('shutdown complete')
        process.exit()
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
})()

import { APIError } from '@/types/errors/error'

export class GuildNotFound extends APIError {
    constructor() {
        super(404, 600, 'guild not found')
        Object.setPrototypeOf(this, GuildNotFound.prototype)
        Error.captureStackTrace(this, GuildNotFound)
    }
}

export class TimerNotFound extends APIError {
    constructor() {
        super(404, 610, 'timer not found')
        Object.setPrototypeOf(this, TimerNotFound.prototype)
        Error.captureStackTrace(this, TimerNotFound)
    }
}

import { DeleteResult, Timestamp, UpdateResult } from 'mongodb'
import mongoose, { PaginateOptions } from 'mongoose'
import { getModelForClass, plugin, prop, ReturnModelType } from '@typegoose/typegoose'
import mongoosePaginate from 'mongoose-paginate-v2'
import { GuildScheduledEvent } from 'discord.js'

import { TimerNotFound } from '@/types/errors/database'
import { InputEvents } from '@/types/inputs'
import { getNowUTCTime, logger } from '@/utils'
import moment from 'moment'

@plugin(mongoosePaginate)
export class Timer extends Timestamp {
    static paginate: mongoose.PaginateModel<typeof Timer>['paginate']

    public _id: mongoose.Types.ObjectId

    @prop({ required: true })
    public guild: string

    @prop()
    public eventId: string

    @prop({ required: true })
    public name: string

    @prop({ required: true })
    public description: string

    @prop({ required: true })
    public timezone: string

    @prop({ required: true })
    public startAt: Date

    @prop()
    public endAt: Date

    @prop()
    public recurrence: string

    @prop({ required: true })
    public locationType: string

    @prop({ required: true })
    public location: string

    @prop({ required: true })
    public channel: string

    @prop()
    public mentions: string

    @prop()
    public nextTime: Date

    @prop({ default: 'scheduled' })
    public status: string

    public static async findByFilter(this: ReturnModelType<typeof Timer>, filter: object): Promise<Timer> {
        const timer = await this.findOne(filter).exec()
        if (timer) {
            return timer
        } else {
            throw new TimerNotFound()
        }
    }

    public static async findByEvent(this: ReturnModelType<typeof Timer>, guild: string, id: string): Promise<Timer> {
        return this.findByFilter({ guild: guild, eventId: id })
    }

    public static async findByGuild(
        this: ReturnModelType<typeof Timer>,
        guild: string,
    ): Promise<mongoose.PaginateResult<mongoose.PaginateDocument<Timer, object>>> {
        return await this.paginate({ guild: guild })
    }

    public static async findByObjectId(this: ReturnModelType<typeof Timer>, id: mongoose.Types.ObjectId): Promise<Timer> {
        return this.findByFilter({ _id: id })
    }

    public static async findByTitle(
        this: ReturnModelType<typeof Timer>,
        guild: string,
        title: string,
    ): Promise<mongoose.PaginateResult<mongoose.PaginateDocument<Timer, object>>> {
        return await this.paginate({ guild: guild, name: { $regex: title } })
    }

    public static async createTimer(this: ReturnModelType<typeof Timer>, event: GuildScheduledEvent): Promise<Timer> {
        return await this.create({
            guild: event.guild.id,
            eventId: event.id,
            name: event.name,
            description: event.description,
            startAt: event.scheduledStartAt,
            locationType: event.entityType,
            location: event.entityType === 3 ? event.entityMetadata.location : event.channel.name,
            channel: event.guild.systemChannel.name,
            status: event.status,
        })
    }

    public static async createTimerByCommands(this: ReturnModelType<typeof Timer>, data: InputEvents): Promise<Timer> {
        const now = getNowUTCTime()
        if (now.getMilliseconds() < data.startAt.getMilliseconds() && data.recurrence === 'none') {
            logger.error(`${now.toISOString()} > ${data.startAt}: Event time has already passed.`)
            throw new Error()
        }

        return await this.create({
            guild: data.guildId,
            eventId: '',
            name: data.name,
            description: data.description,
            locationType: data.locationType,
            location: data.location,
            startAt: data.startAt,
            endAt: data.endAt,
            timezone: data.timezone,
            recurrence: data.recurrence,
            channel: data.channel,
            mentions: data.mentions,
        })
    }

    public static async findByExecutionTime(
        this: ReturnModelType<typeof Timer>,
        page: number,
        time: Date,
    ): Promise<mongoose.PaginateResult<mongoose.PaginateDocument<Timer, object, PaginateOptions>>> {
        return await this.paginate({ startAt: { $lte: time } }, { limit: 200, page: page })
    }

    public static async updateNextExecutionTime(this: ReturnModelType<typeof Timer>, timer: Timer): Promise<UpdateResult> {
        const momentStart = moment(timer.startAt)
        const startDay = momentStart.day()
        const momentEnd = moment(timer.endAt)
        const endDay = momentEnd.day()
        let nextStart: Date
        let nextEnd: Date
        if (timer.recurrence === 'weekly') {
            nextStart = momentStart.add(1, 'week').days(startDay).toDate()
            nextEnd = momentEnd.add(1, 'week').days(endDay).toDate()
        } else if (timer.recurrence === 'biweekly') {
            nextStart = momentStart.add(2, 'week').days(startDay).toDate()
            nextEnd = momentEnd.add(2, 'week').days(endDay).toDate()
        } else if (timer.recurrence === 'monthly') {
            nextStart = momentStart.add(1, 'month').days(startDay).toDate()
            nextEnd = momentEnd.add(1, 'month').days(endDay).toDate()
        } else {
            nextStart = momentStart.add(1, 'year').days(startDay).toDate()
            nextEnd = momentEnd.add(1, 'year').days(endDay).toDate()
        }
        return await this.updateOne({ _id: timer._id }, { startAt: nextStart, endAt: nextEnd }).exec()
    }

    public async updateByObject(data: object): Promise<Timer> {
        return await TimerModel.findOneAndUpdate(
            { _id: this._id },
            {
                ...data,
            },
            {
                new: true,
            },
        ).exec()
    }

    public static async deleteByGuildId(this: ReturnModelType<typeof Timer>, id: string): Promise<DeleteResult> {
        return this.deleteMany({ guild: id })
    }

    public static async deleteById(this: ReturnModelType<typeof Timer>, id: mongoose.Types.ObjectId): Promise<DeleteResult> {
        return this.deleteOne({ _id: id })
    }
}

export const TimerModel = getModelForClass(Timer)

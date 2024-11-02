import { DeleteResult, Timestamp } from 'mongodb'
import mongoose from 'mongoose'
import { getModelForClass, prop, ReturnModelType } from '@typegoose/typegoose'
import { GuildNotFound } from '@/types/errors/database'
export class Guild extends Timestamp {
    public _id: mongoose.Types.ObjectId

    @prop({ required: true, unique: true })
    public guildId: string

    @prop({ required: true })
    public name: string

    public static async findByFilter(this: ReturnModelType<typeof Guild>, filter: object): Promise<Guild> {
        const guild = await this.findOne(filter).exec()
        if (guild) {
            return guild
        } else {
            throw new GuildNotFound()
        }
    }

    public static async findById(this: ReturnModelType<typeof Guild>, id: string): Promise<Guild> {
        return await this.findByFilter({ guildId: id })
    }

    public static async deleteById(this: ReturnModelType<typeof Guild>, id: string): Promise<DeleteResult> {
        return this.deleteOne({ guildId: id })
    }
}

export const GuildModel = getModelForClass(Guild)

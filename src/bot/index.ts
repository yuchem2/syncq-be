import { Client, EmbedBuilder, Events, GatewayIntentBits, Guild, Interaction } from 'discord.js'

import { logger } from '@/utils/logger'
import commands from '@/commands'
import { GuildModel } from '@/models/guild'
import { Timer, TimerModel } from '@/models/timer'
import { APIError } from '@/types/errors/error'
import { InternalServerError } from '@/types/errors/server'
import { BOT_TOKEN } from '@/config'
import { convertUTCToTimezone } from '@/utils'

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.MessageContent] })

export async function botStartup() {
    await client.login(BOT_TOKEN).then(() => {
        logger.info(`successfully login discord bot ${client.user.tag}`)
    })

    // error handler
    client.on(Events.Error, (error: APIError) => {
        try {
            if (!(error instanceof APIError)) {
                error = new InternalServerError(error)
            }
        } catch (err) {
            logger.error('fail in error middleware', { original: error, new: err })
        }
    })

    // default listener
    client.on(Events.ClientReady, async () => {
        if (client.application) {
            await client.application.commands.set(commands)
            logger.info(`Successfully added commands`)
        }
    })

    // guild listener
    client.on(Events.GuildCreate, async (guild: Guild) => {
        const guildInstance = await GuildModel.create({
            guildId: guild.id,
            name: guild.name,
        })
        logger.info(`bot is invited at ${guildInstance.name}`)
        // NOTE: 현재 discord.js에서 반복 주기 확인 불가로, bot을 통해 등록된 정보로 이벤트 저장 및 반복 수행
        // const events = await guild.scheduledEvents.fetch()
        // events.forEach((event) => TimerModel.createTimer(event))
    })

    client.on(Events.GuildDelete, async (guild: Guild) => {
        await GuildModel.deleteById(guild.id)
        const timer = TimerModel.findById(guild.id)
        if (timer) {
            await TimerModel.deleteByGuildId(guild.id)
        }
    })

    // event listener
    /*client.on(Events.GuildScheduledEventCreate, async (event) => {
        await TimerModel.createTimer(event)
        logger.info(`new event create: ${event.name} in guild ${event.guild.name}. \n`)
    })*/

    /*client.on(Events.GuildScheduledEventUpdate, async (event) => {
        await TimerModel.updateOne(
            { guild: event.guild.id, eventId: event.id },
            {
                name: event.name,
                startAt: event.scheduledStartAt,
                location: event.entityType === 3 ? event.entityMetadata.location : event.channel.name,
                channel: event.guild.systemChannel.name,
                status: event.status,
            },
        )
        logger.info(`event modified: ${event.name} in guild ${event.guild.name}.`)
    })*/

    /*client.on(Events.GuildScheduledEventDelete, async (event) => {
        const timer = await TimerModel.findByEvent(event.guild.id, event.id)
        await TimerModel.deleteById(timer._id)
        logger.info(`event deleted: ${event.name} in guild ${event.guild.name}.`)
    })*/

    // '/' commands listener
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (interaction.isCommand()) {
            const currentCommand = commands.find(({ name }) => name === interaction.commandName)

            if (currentCommand) {
                await interaction.deferReply()
                currentCommand.execute(client, interaction)
                logger.info(`info: command ${currentCommand.name} handled correctly`)
            }
        }
    })
}

export async function sendMessage(timer: Timer) {
    try {
        const channel = await client.channels.fetch(timer.channel)
        if (channel && channel.isSendable()) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Upcoming Event')
                .addFields(
                    { name: 'Event Title', value: timer.name },
                    { name: 'Description', value: timer.description },
                    { name: 'Location', value: `${timer.location}(${timer.locationType})` },
                    {
                        name: `Start at(${timer.timezone})`,
                        value: `${convertUTCToTimezone(timer.startAt, timer.timezone)}`,
                    },
                    {
                        name: `End at(${timer.timezone})`,
                        value: `${convertUTCToTimezone(timer.startAt, timer.timezone)}`,
                    },
                )
            channel.send({
                content: `${timer.mentions} This event will be start!`,
                embeds: [embed],
            })
        }

        if (timer.recurrence !== 'none') {
            await TimerModel.updateNextExecutionTime(timer)
        } else {
            await TimerModel.deleteById(timer._id)
        }
    } catch (e) {
        logger.error(`Fail to send message: Timer ${timer._id}`, e)
        // TODO: error handling
    }
}

export async function botStop() {
    await client.destroy()
}

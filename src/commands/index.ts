import mongoose from 'mongoose'
import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    CacheType,
    CommandInteraction,
    ComponentType,
    EmbedBuilder,
    Interaction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js'

import { SlashCommand } from '@/types/slashCommand'
import { convertTimezone, convertUTCToTimezone, logger } from '@/utils'
import { Timer, TimerModel } from '@/models/timer'
import { InputEvents } from '@/types/inputs'

/*export const checkEvents: SlashCommand = {
    name: 'check',
    description: 'check events in guilds',
    execute: async (_, interaction) => {
        const events = await interaction.guild.scheduledEvents.fetch()
        events.forEach((event) => {
            interaction.followUp({
                ephemeral: true,
                content: event.toString(),
            })
        })
    },
}*/

const makeEvent: SlashCommand = {
    name: 'register',
    description: 'make custom event is guilds',
    options: [
        {
            name: 'name',
            type: ApplicationCommandOptionType.String,
            description: 'Event name',
            required: true,
            maxLength: 100,
        },
        {
            name: 'description',
            type: ApplicationCommandOptionType.String,
            description: 'Event description',
            required: true,
            maxLength: 400,
        },
        {
            name: 'location_type',
            type: ApplicationCommandOptionType.String,
            description: 'Type of location',
            required: true,
            choices: [
                { name: 'Voice', value: 'voice' },
                { name: 'Text', value: 'text' },
                { name: 'External', value: 'external' },
            ],
        },
        {
            name: 'location',
            type: ApplicationCommandOptionType.String,
            description: 'Event location',
            required: true,
        },
        {
            name: 'timezone',
            type: ApplicationCommandOptionType.String,
            description: 'Timezone',
            required: true,
            choices: [
                { name: 'UTC', value: 'UTC' },
                { name: 'Korean Standard Time (KST)', value: 'Asia/Seoul' },
                { name: 'Eastern Standard Time (EST)', value: 'America/New_York' },
                { name: 'Pacific Standard Time (PST)', value: 'America/Los_Angeles' },
                { name: 'Central European Time (CET)', value: 'Europe/Berlin' },
                { name: 'Greenwich Mean Time (GMT)', value: 'Europe/London' },
                { name: 'Japan Standard Time (JST)', value: 'Asia/Tokyo' },
                { name: 'Australian Eastern Time (AET)', value: 'Australia/Sydney' },
                { name: 'India Standard Time (IST)', value: 'Asia/Kolkata' },
                { name: 'China Standard Time (CST)', value: 'Asia/Shanghai' },
                { name: 'Brasília Time (BRT)', value: 'America/Sao_Paulo' },
                { name: 'Moscow Standard Time (MSK)', value: 'Europe/Moscow' },
            ],
        },
        {
            name: 'start',
            type: ApplicationCommandOptionType.String, // ISO 8601 format string
            description: 'Start time of the event (YYYY-MM-DD HH:mm:ss)',
            required: true,
        },
        {
            name: 'end',
            type: ApplicationCommandOptionType.String, // ISO 8601 format string
            description: 'End time of the event (YYYY-MM-DD HH:mm:ss)',
            required: true,
        },
        {
            name: 'recurrence',
            type: ApplicationCommandOptionType.String,
            description: 'Recurrence pattern',
            required: true,
            choices: [
                { name: 'None', value: 'none' },
                { name: 'Weekly', value: 'weekly' },
                { name: 'Biweekly', value: 'biweekly' },
                { name: 'Monthly', value: 'monthly' },
                { name: 'Annually', value: 'annually' },
            ],
        },
        {
            name: 'notification_channel',
            type: ApplicationCommandOptionType.Channel,
            description: 'Notification channel name',
            required: true,
        },
        {
            name: 'mentions',
            type: ApplicationCommandOptionType.Role,
            description: 'Mentioned members or groups',
            required: false,
        },
    ],
    execute: async (_, interaction) => {
        const options = interaction.options
        const timezone = options.get('timezone').value as string
        const stTime = (options.get('start').value as string).split(' ')
        const endTime = (options.get('end').value as string).split(' ')
        const startAt = convertTimezone(stTime[0], stTime[1], timezone)
        const endAt = convertTimezone(endTime[0], endTime[1], timezone)

        try {
            const data: InputEvents = {
                guildId: interaction.guild.id,
                name: options.get('name').value as string,
                description: options.get('description').value as string,
                locationType: options.get('location_type').value as string,
                location: options.get('location').value as string,
                startAt: startAt,
                endAt: endAt,
                timezone: timezone,
                recurrence: options.get('recurrence').value as string,
                channel: options.get('notification_channel').channel.id,
                mentions: options.get('mentions').role.toString(),
            }
            const timer = await TimerModel.createTimerByCommands(data)

            const eventEmbed = await getEventEmbed(interaction, 'New Event', timer)
            await interaction.followUp({
                ephemeral: true,
                content: `Successfully create new custom event!`,
                embeds: [eventEmbed],
            })
        } catch (e) {
            await interaction.followUp({
                ephemeral: true,
                content: `Fail to create new custom event`,
            })
        }
    },
}

async function getEventEmbed(interaction: CommandInteraction<CacheType>, title: string, timer: Timer): Promise<EmbedBuilder> {
    const channelName = await interaction.client.channels.fetch(timer.channel)
    return new EmbedBuilder()
        .setColor('#0099ff') // You can choose any color you like
        .setTitle(title)
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
                value: `${convertUTCToTimezone(timer.endAt, timer.timezone)}`,
            },
            { name: 'Recurrence', value: timer.recurrence },
            { name: 'Notification Channel', value: channelName.toString() },
            { name: 'Mentions', value: timer.mentions },
        )
}

const findEvents: SlashCommand = {
    name: 'find',
    description: 'find custom events in guild',
    options: [
        {
            name: 'title',
            type: ApplicationCommandOptionType.String,
            description: 'Event title',
            required: true,
            maxLength: 100,
        },
    ],
    execute: async (_, interaction) => {
        const target = interaction.options.get('title').value as string
        try {
            const timers = await TimerModel.findByTitle(interaction.guild.id, target)
            if (timers.totalDocs === 0) {
                await interaction.followUp({
                    ephemeral: true,
                    content: 'There is no event with that title',
                })
                return
            }
            const embeds = await Promise.all(
                timers.docs.map(async (timer) => {
                    return await getEventEmbed(interaction, `Find custom event ID: ${timer._id}`, timer)
                }),
            )
            await interaction.followUp({
                ephemeral: true,
                content: `Successfully find custom event!`,
                embeds: embeds,
            })
            await interaction.followUp({
                ephemeral: true,
                content: 'If you want to modify some event? please use /modify with event ID(just copy it)',
            })
        } catch (e) {
            await interaction.followUp({
                ephemeral: true,
                content: `Fail to find custom event`,
            })
        }
    },
}

const deleteEvent: SlashCommand = {
    name: 'cancel',
    description: 'delete custom events in guild',
    options: [
        {
            name: 'id',
            type: ApplicationCommandOptionType.String,
            description: 'Event ID',
            required: true,
            maxLength: 100,
        },
    ],
    execute: async (_, interaction) => {
        const target = interaction.options.get('id').value as string
        try {
            await TimerModel.deleteById(new mongoose.Types.ObjectId(target))
            await interaction.followUp({
                ephemeral: true,
                content: `Successfully delete custom event: ${target}`,
            })
        } catch (e) {
            await interaction.followUp({
                ephemeral: true,
                content: 'Fail to delete custom event',
            })
        }
    },
}

const modifyEvent: SlashCommand = {
    name: 'modify',
    description: 'modify custom events in guild',
    options: [
        {
            name: 'id',
            type: ApplicationCommandOptionType.String,
            description: 'Event ID',
            required: true,
            maxLength: 100,
        },
    ],
    execute: async (_, interaction) => {
        const target = interaction.options.get('id').value as string
        try {
            const timer = await TimerModel.findByObjectId(new mongoose.Types.ObjectId(target))
            const embed = await getEventEmbed(interaction, `Check target timer fields`, timer)

            const createButtons = [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('name').setLabel('Title').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('description').setLabel('Description').setStyle(ButtonStyle.Primary),
                    // new ButtonBuilder().setCustomId('location_type').setLabel('Location Type').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('location').setLabel('location').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('start').setLabel('startAt').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('end').setLabel('endAt').setStyle(ButtonStyle.Primary),
                    // new ButtonBuilder().setCustomId('recurrence').setLabel('Recurrence').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('channel').setLabel('Channel').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('mentions').setLabel('mentions').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('done').setLabel('Done').setStyle(ButtonStyle.Success),
                ),
            ]

            await interaction.followUp({
                ephemeral: true,
                content: `Select the field to modify, and click "Done" when finished.`,
                embeds: [embed],
                components: createButtons,
            })

            const modifications = {}
            const buttonCollector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 })

            buttonCollector.on('collect', async (btnInteraction) => {
                if (btnInteraction.user.id !== interaction.user.id) return

                const fieldName = btnInteraction.customId
                if (fieldName === 'done') {
                    buttonCollector.stop()
                    try {
                        const modifiedTimer = await timer.updateByObject(modifications)
                        const modifyEmbed = await getEventEmbed(interaction, 'Modfied event', modifiedTimer)
                        await interaction.deleteReply()
                        await interaction.followUp({
                            ephemeral: true,
                            content: 'Modification session ended.',
                            embeds: [modifyEmbed],
                        })
                        return
                    } catch (e) {
                        await interaction.followUp({
                            ephemeral: true,
                            content: 'Failed to update fields',
                        })
                        logger.error(e)
                        return
                    }
                }

                function createModalForField(fieldName: string, currentValue: any) {
                    const modal = new ModalBuilder().setCustomId(`${fieldName}modal`).setTitle(`Modify ${fieldName}`)

                    /*function getDropdownOptions(fieldName: string) {
                        switch (fieldName) {
                            case 'location_type':
                                return [
                                    { label: 'Voice', value: 'voice' },
                                    { label: 'Text', value: 'text' },
                                    { label: 'External', value: 'external' },
                                ]
                            case 'recurrence':
                                return [
                                    { label: 'None', value: 'none' },
                                    { label: 'Weekly', value: 'weekly' },
                                    { label: 'Biweekly', value: 'biweekly' },
                                    { label: 'Monthly', value: 'monthly' },
                                    { label: 'Annually', value: 'annually' },
                                ]
                        }
                    }*/
                    let input: any
                    switch (fieldName) {
                        /*case 'location_type':
                        case 'recurrence':
                            const dropdown = new StringSelectMenuBuilder()
                                .setCustomId('fieldInput')
                                .setPlaceholder(`Select ${fieldName}`)
                                .setOptions(getDropdownOptions(fieldName))
                            return modal.addComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(dropdown))*/
                        case 'start':
                        case 'end':
                            input = new TextInputBuilder()
                                .setCustomId('fieldInput')
                                .setLabel(`Enter Date/Time (YYYY-MM-DD HH:mm:ss)`)
                                .setStyle(TextInputStyle.Short)
                                .setValue(currentValue || '')
                            break
                        case 'description':
                            input = new TextInputBuilder()
                                .setCustomId('fieldInput')
                                .setLabel(`Enter new value for ${fieldName}`)
                                .setStyle(TextInputStyle.Paragraph)
                                .setValue(currentValue || '')
                            break
                        default:
                            input = new TextInputBuilder()
                                .setCustomId('fieldInput')
                                .setLabel(`Enter new value for ${fieldName}`)
                                .setStyle(TextInputStyle.Short)
                                .setValue(currentValue || '')
                            break
                    }
                    return modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input))
                }
                const modal = createModalForField(fieldName, timer[fieldName])
                await btnInteraction.showModal(modal)
            })

            interaction.client.on('interactionCreate', async (modalInteraction: Interaction) => {
                if (modalInteraction.isModalSubmit() && modalInteraction.customId.endsWith('modal')) {
                    const fieldName = modalInteraction.customId.replace('modal', '')
                    modifications[fieldName] = modalInteraction.fields.getTextInputValue('fieldInput')
                    await modalInteraction.deferUpdate()
                }
            })
        } catch (e) {
            await interaction.followUp({
                ephemeral: true,
                content: `Fail to modify custom event`,
            })
            logger.error(e)
        }
    },
}

const listEvent: SlashCommand = {
    name: 'all',
    description: 'List all custom events in guild',
    execute: async (_, interaction) => {
        try {
            const timers = await TimerModel.findByGuild(interaction.guild.id)
            if (timers.totalDocs === 0) {
                await interaction.followUp({
                    ephemeral: true,
                    content: 'There is no event in guild',
                })
                return
            }
            const embeds = await Promise.all(
                timers.docs.map(async (timer) => {
                    return await getEventEmbed(interaction, `Find custom event ID: ${timer._id}`, timer)
                }),
            )
            await interaction.followUp({
                ephemeral: true,
                content: `Successfully find all custom event`,
                embeds: embeds,
            })
            await interaction.followUp({
                ephemeral: true,
                content: 'If you want to modify some event? please use /modify with event ID(just copy it)',
            })
        } catch (e) {
            await interaction.followUp({
                ephemeral: true,
                content: `Fail to find custom event`,
            })
        }
    },
}

export default [makeEvent, findEvents, modifyEvent, deleteEvent, listEvent]

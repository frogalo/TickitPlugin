import { ChannelType, PermissionFlagsBits } from 'discord.js'
import { logger } from 'robo.js'
import { TICKET_CONFIG } from '../config/constants.js'

export const GUILD_TYPE = 'guild'
export const INTERACTION_TYPE = 'interaction'

/**
 * Initializes the configuration channel for the guild.
 * @param {Object} guildOrInteraction - The guild or interaction object.
 * @param {string} type - The type of object passed (GUILD_TYPE or INTERACTION_TYPE).
 */
export async function initializeConfigurationChannel(guildOrInteraction, type) {
    let guild, guildId

    if (type === GUILD_TYPE) {
        guild = guildOrInteraction
        guildId = guild.id
    } else if (type === INTERACTION_TYPE) {
        guild = guildOrInteraction.guild
        guildId = guildOrInteraction.guildId
    } else {
        logger.error('Invalid type specified. Expected "guild" or "interaction".')
        return
    }

    if (!guildId || !guild) {
        logger.error('Guild object is undefined or guild ID is missing.')
        return
    }

    logger.info(`Initializing configuration channel for guild: ${guildId}`)

    try {
        // Create or get Tickit category
        let configurationCategory = guild.channels.cache.find(
            (category) => category.name === TICKET_CONFIG.CATEGORY_NAME && category.type === ChannelType.GuildCategory
        )

        if (!configurationCategory) {
            logger.info(`Creating "${TICKET_CONFIG.CATEGORY_NAME}" category...`)
            configurationCategory = await guild.channels.create({
                name: TICKET_CONFIG.CATEGORY_NAME,
                type: ChannelType.GuildCategory
            })
            logger.info(`Successfully created the "${TICKET_CONFIG.CATEGORY_NAME}" category.`)
        } else {
            logger.info(`The "${TICKET_CONFIG.CATEGORY_NAME}" category already exists.`)
        }

        // Check if configuration channel already exists
        const existingChannel = guild.channels.cache.find(
            (channel) => channel.name === TICKET_CONFIG.CONFIGURATION_CHANNEL_NAME && channel.type === ChannelType.GuildText
        )

        if (existingChannel) {
            logger.info(`The "${TICKET_CONFIG.CONFIGURATION_CHANNEL_NAME}" channel already exists in guild: ${guildId}.`)
            return
        }

        // Create configuration channel
        logger.info(`Creating "${TICKET_CONFIG.CONFIGURATION_CHANNEL_NAME}" channel...`)
        const configurationChannel = await guild.channels.create({
            name: TICKET_CONFIG.CONFIGURATION_CHANNEL_NAME,
            type: ChannelType.GuildText,
            parent: configurationCategory?.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ]
        })
        logger.info(`Successfully created the "${TICKET_CONFIG.CONFIGURATION_CHANNEL_NAME}" channel in guild: ${guildId}.`)

        // Import step0 here to avoid circular imports
        const { step0 } = await import('./steps/step0.js')
        await step0(configurationChannel, 'initialize')
    } catch (error) {
        logger.error('An error occurred during initialization:', error)
    }
}
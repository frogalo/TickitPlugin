import { ChannelType, PermissionFlagsBits } from 'discord.js'
import { logger } from 'robo.js'

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
            (category) => category.name === 'Tickit' && category.type === ChannelType.GuildCategory
        )

        if (!configurationCategory) {
            logger.info('Creating "Tickit" category...')
            configurationCategory = await guild.channels.create({
                name: 'Tickit',
                type: ChannelType.GuildCategory
            })
            logger.info('Successfully created the "Tickit" category.')
        } else {
            logger.info('The "Tickit" category already exists.')
        }

        // Check if configuration channel already exists
        const existingChannel = guild.channels.cache.find(
            (channel) => channel.name === 'configuration' && channel.type === ChannelType.GuildText
        )

        if (existingChannel) {
            logger.info(`The "configuration" channel already exists in guild: ${guildId}.`)
            return
        }

        // Create configuration channel
        logger.info('Creating "configuration" channel...')
        const configurationChannel = await guild.channels.create({
            name: 'configuration',
            type: ChannelType.GuildText,
            parent: configurationCategory?.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ]
        })
        logger.info(`Successfully created the "configuration" channel in guild: ${guildId}.`)

        // Import step0 here to avoid circular imports
        const { step0 } = await import('./steps/step0.js')
        await step0(configurationChannel, 'initialize')
    } catch (error) {
        logger.error('An error occurred during initialization:', error)
    }
}
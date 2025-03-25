import { logger } from 'robo.js'
import { initializeConfigurationChannel } from '../../../config/initialSetup.js'
import { GUILD_TYPE } from '../../../config/initialSetup.js'

let guildId
let ownerId

export default async (interaction) => {
	if (!interaction) {
		logger.error('Interaction object is undefined.')
		return
	}

	// Extract the `commands` object from the interaction
	const commands = interaction?.commands

	if (!commands) {
		logger.error('Commands object is undefined or the interaction is not associated with a guild.')
		return
	}

	// Handle new guild detection
	const guild = commands.guild
	if (guild) {
		guildId = guild.id
		ownerId = guild.ownerId

		// TODO: Check if the guild is already in the database

		// logger.info('Guild detected:', {
		// 	id: guildId,
		// 	name: guild.name,
		// 	ownerId: ownerId,
		// 	memberCount: guild.memberCount,
		// 	preferredLocale: guild.preferredLocale
		// })

		// // Log additional guild details
		// logger.info('Additional guild details:', {
		// 	systemChannelId: guild.systemChannelId,
		// 	rulesChannelId: guild.rulesChannelId,
		// 	publicUpdatesChannelId: guild.publicUpdatesChannelId,
		// 	premiumTier: guild.premiumTier,
		// 	premiumSubscriptionCount: guild.premiumSubscriptionCount
		// })
	} else {
		logger.error('Guild object is undefined.')
	}

	// Log permissions details
	const permissions = commands.permissions
	if (permissions) {
		// logger.info('Permissions details:', {
		// 	guildId: permissions.guild.id,
		// 	commandId: permissions.commandId || 'N/A'
		// })
	} else {
		logger.error('Permissions object is undefined.')
	}
	if (guild && guild.id) {
		await initializeConfigurationChannel(guild, GUILD_TYPE)
	} else {
		logger.error('Guild object is undefined.')
	}
}

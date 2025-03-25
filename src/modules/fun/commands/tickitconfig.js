import { createCommandConfig, logger } from 'robo.js'
import {initializeConfigurationChannel, INTERACTION_TYPE} from '../../../config/initialSetup.js'

/*
 * Customize your command details and options here.
 *
 * For more information, see the documentation:
 * https://robojs.dev/discord-bots/commands#command-options
 */
export const tickitconfig = createCommandConfig({
	description: 'Creates configuration channel for Tickit Plugin!'
})

/**
 * This is your command handler that will be called when the command is used.
 * You can either use the `interaction` Discord.js object directly, or return a string or object.
 *
 * For more information, see the documentation:
 * https://robojs.dev/discord-bots/commands
 */
export default async (interaction) => {
	if (interaction && interaction.guildId) {
		await initializeConfigurationChannel(interaction, INTERACTION_TYPE);
	} else {
		logger.error('Interaction is not from a guild.');
	}
}

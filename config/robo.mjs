// @ts-check

/**
 * @type {import('robo.js').Config}
 **/
export default {
	clientOptions: {
		intents: ['Guilds', 'GuildMessages', 'MessageContent'] // Specify the intents your bot needs
	},
	logger: {
		level: 'info' // Set the logging level
	},
	plugins: [], // Add plugins here if needed
	defaults: {
		help: false // Disable the /help command
	}
};

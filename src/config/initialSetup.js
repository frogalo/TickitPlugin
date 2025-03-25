import {
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ChannelType,
	StringSelectMenuBuilder,
	RoleSelectMenuBuilder
} from 'discord.js'
import { logger } from 'robo.js'

/**
 * Constants for identifying the type of object passed to initialization functions.
 */
export const GUILD_TYPE = 'guild'
export const INTERACTION_TYPE = 'interaction'

/**
 * Initializes the configuration channel for the guild.
 * @param {Object} guildOrInteraction - The guild or interaction object.
 * @param {string} type - The type of object passed (GUILD_TYPE or INTERACTION_TYPE).
 */
export async function initializeConfigurationChannel(guildOrInteraction, type) {
	let guild, guildId

	// Determine what was passed based on the type parameter
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

	// Check if the "Tickit" category exists, create it if not
	let configurationCategory = guild.channels.cache.find(
		(category) => category.name === 'Tickit' && category.type === ChannelType.GuildCategory
	)

	if (!configurationCategory) {
		try {
			logger.info('Creating "Tickit" category...')
			configurationCategory = await guild.channels.create({
				name: 'Tickit',
				type: ChannelType.GuildCategory
			})
			logger.info('Successfully created the "Tickit" category.')
		} catch (error) {
			logger.error('An error occurred while creating the "Tickit" category:', error)
			return // Exit if the category creation fails
		}
	} else {
		logger.info('The "Tickit" category already exists.')
	}

	// Check if the "configuration" channel already exists
	const existingChannel = guild.channels.cache.find(
		(channel) => channel.name === 'configuration' && channel.type === ChannelType.GuildText
	)

	if (existingChannel) {
		logger.info(`The "configuration" channel already exists in guild: ${guildId}.`)
		return // Exit if the channel already exists
	}

	try {
		logger.info('Creating "configuration" channel...')
		const configurationChannel = await guild.channels.create({
			name: 'configuration',
			type: ChannelType.GuildText,
			parent: configurationCategory?.id, // Optional chaining is used here
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: ['ViewChannel'] // Deny everyone from viewing the channel
				}
			]
		})
		logger.info(`Successfully created the "configuration" channel in guild: ${guildId}.`)

		// Send Step 0 (general instructions)
		const step0Embed = step0CreateGeneralInstructionsEmbed()
		const step0Button = step0CreateStartButton()
		const step0Row = new ActionRowBuilder().addComponents(step0Button)

		await configurationChannel.send({ embeds: [step0Embed], components: [step0Row] })
	} catch (error) {
		logger.error('An error occurred while creating the "configuration" channel:', error)
	}
}

/**
 * Creates the general instructions embed for Step 0. (Welcome message)
 * @returns {EmbedBuilder} The general instructions embed.
 */
export function step0CreateGeneralInstructionsEmbed() {
	return new EmbedBuilder()
		.setColor('c1daa1') // Light green color
		.setTitle('Welcome to Tickit Configuration')
		.setDescription(
			`Welcome to the **Tickit Configuration** process! 🎉\n\n` +
				`This setup will guide you through the following steps:\n\n` +
				`1️⃣ **Select Configuration Mode**: Choose how the bot will operate.\n` +
				`2️⃣ **Assign Roles**: Select the role that will manage tickets.\n` +
				`3️⃣ **Set Up Channels**: Choose where tickets will be created.`
		)
		.setFooter({ text: 'Click "Start Configuration" to begin.' })
}

/**
 * Creates the "Start Configuration" button for Step 0.
 * @returns {ButtonBuilder} The start button.
 */
export function step0CreateStartButton() {
	return new ButtonBuilder()
		.setCustomId('start-configuration')
		.setLabel('Start Configuration')
		.setStyle(ButtonStyle.Primary)
		.setEmoji('🚀') // Add a rocket emoji
}

/**
 * Handles the "Start Configuration" button for Step 0 and moves to Step 1.
 * @param {Object} interaction - The Discord interaction object.
 */
export async function step0HandleStartConfiguration(interaction) {
	try {
		// Step 1 embed and menu
		const step1Embed = step1CreateConfigurationEmbed()
		const configModeMenu = step1CreateConfigModeSelectMenu()
		const configModeRow = new ActionRowBuilder().addComponents(configModeMenu)

		// Update the Step 0 message: remove the button and update the footer
		const updatedStep0Embed = EmbedBuilder.from(interaction.message.embeds[0]) // Clone the existing embed
			.setFooter({ text: null }) // Update the footer

		await interaction.message.edit({
			embeds: [updatedStep0Embed], // Update the embed
			components: [] // Remove the button
		})

		// Send a new message for Step 1
		await interaction.channel.send({
			embeds: [step1Embed],
			components: [configModeRow]
		})

		// Acknowledge the interaction to prevent timeout
		await interaction.deferUpdate()

		logger.info(`Admin started configuration in guild: ${interaction.guild.name}`)
	} catch (error) {
		logger.error('An error occurred while starting the configuration process:', error)
	}
}

/**
 * Creates the main configuration embed for Step 1.
 * @returns {EmbedBuilder} The configuration embed.
 */
export function step1CreateConfigurationEmbed() {
	return new EmbedBuilder()
		.setColor('c1daa1') // Light green color
		.setTitle('Step 1: Configuration Mode')
		.setDescription(
			`**Please select the mode in which the bot will operate:**\n\n` +
				`💻 **Run Locally**: Keep everything local to your Discord server.\n` +
				`🌐 **Use Online Dashboard** *(Coming Soon)*: Manage tickets via an online dashboard.\n\n` +
				`Choose an option below to proceed.`
		)
		.setFooter({ text: '🔄 You can change this later if needed.' })
}

/**
 * Creates the configuration mode menu for Step 1.
 * @returns {StringSelectMenuBuilder} The configuration mode menu.
 */
export function step1CreateConfigModeSelectMenu() {
	return new StringSelectMenuBuilder()
		.setCustomId('configuration-mode')
		.setPlaceholder('Select Configuration Mode')
		.addOptions([
			{
				label: 'Run Locally',
				description: 'Keep everything local to your Discord server.',
				value: 'run-locally',
				emoji: '💻'
			},
			{
				label: 'Use Online Dashboard',
				description: 'Manage tickets via the online dashboard (coming soon).',
				value: 'use-online-dashboard',
				emoji: '🌐'
			}
		])
}

/**
 * Creates the role selection instruction embed for Step 2.
 * @returns {EmbedBuilder} The role selection instruction embed.
 */
export function step2CreateRoleInstructionEmbed() {
	return new EmbedBuilder()
		.setColor('c1daa1')
		.setTitle('Step 2: Role Selection')
		.setDescription(
			'👥 **Select the role that will manage tickets for your server.**\n\n' +
				'This role will have access to view and manage all tickets created by users. ' +
				'Make sure to select a role that is trusted and has the appropriate permissions. ' +
				'You can change this role later if needed by reconfiguring the bot settings.\n\n' +
				'Choose a role from the dropdown below.'
		)
		.setFooter({ text: '🔄 You can change this later if needed.' })
}

/**
 * Creates the role selection menu for Step 2.
 * @param {string} customId - The custom ID for the menu.
 * @returns {RoleSelectMenuBuilder} The role selection menu.
 */
export function step2CreateRoleSelectMenu(customId = 'role-selection') {
	return new RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder('Select a Role')
}

/**
 * Creates the channel setup instruction embed for Step 3.
 * @returns {EmbedBuilder} The channel setup instruction embed.
 */
export function step3CreateChannelInstructionEmbed() {
	return new EmbedBuilder()
		.setColor('c1daa1')
		.setTitle('Step 3: Channel Setup')
		.setDescription(
			'📁 **Where would you like tickets to be created?**\n\n' +
				'You have two options for setting up ticket creation:\n\n' +
				'📝 **Create a new channel**:\n' +
				'This option will create a dedicated channel named "🎫-create-a-ticket" in your server. ' +
				'Users will use this channel to create tickets. It is ideal if you want a clean and organized setup.\n\n' +
				'🔍 **Use an existing channel**:\n' +
				'This option allows you to select an existing channel in your server where users can create tickets. ' +
				'It is useful if you already have a channel for support or ticket-related purposes.\n\n' +
				'Make sure the selected channel is accessible to your users and fits your server’s structure.\n\n' +
				'Choose an option below to proceed.'
		)
		.setFooter({ text: '🔄 You can change this anytime.' })
}

/**
 * Creates the channel options select menu for Step 3.
 * @returns {StringSelectMenuBuilder} The channel options select menu.
 */
export function step3CreateChannelOptionsSelectMenu() {
	return new StringSelectMenuBuilder()
		.setCustomId('channel-selection') // Custom ID for the menu
		.setPlaceholder('Select Channel Option') // Placeholder text
		.addOptions([
			{
				label: 'Create a new channel',
				description: 'Create a dedicated "create-a-ticket" channel',
				value: 'new-channel',
				emoji: '📝' // Add emoji for visual appeal
			},
			{
				label: 'Use existing channel',
				description: 'Select an existing channel for tickets',
				value: 'existing-channel',
				emoji: '🔍' // Add emoji for visual appeal
			}
		])
}

/**
 * Handles the "Create a new channel" option for Step 3.
 * @param {Object} interaction - The Discord interaction object.
 */
export async function step3HandleNewChannel(interaction) {
	try {
		// Check if the "Tickit" category exists
		let tickitCategory = interaction.guild.channels.cache.find(
			(channel) => channel.name === 'Tickit' && channel.type === ChannelType.GuildCategory
		)

		// If the category doesn't exist, create it
		if (!tickitCategory) {
			tickitCategory = await interaction.guild.channels.create({
				name: 'Tickit',
				type: ChannelType.GuildCategory
			})
			logger.info(`Created "Tickit" category in guild: ${interaction.guild.name}`)
		}

		// Check if the ticket channel already exists under the "Tickit" category
		const existingTicketChannel = interaction.guild.channels.cache.find(
			(channel) => channel.name === '🎫-create-a-ticket' && channel.parentId === tickitCategory.id
		)

		if (existingTicketChannel) {
			// Notify the user that the channel already exists
			const notificationMessage = await interaction.channel.send({
				content: `⚠️ **The ticket channel already exists:** <#${existingTicketChannel.id}>`
			})

			// Remove the notification after 5 seconds
			setTimeout(async () => {
				try {
					await notificationMessage.delete()
					logger.info('Deleted notification message for existing ticket channel.')
				} catch (error) {
					logger.error('Error deleting notification message:', error)
				}
			}, 5000)

			return
		}

		// Create the new ticket channel under the "Tickit" category
		const newTicketChannel = await interaction.guild.channels.create({
			name: '🎫-create-a-ticket',
			type: ChannelType.GuildText,
			parent: tickitCategory.id, // Set the parent to the "Tickit" category
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone.id,
					allow: ['ViewChannel', 'SendMessages']
				}
			]
		})

		// Notify the user that the channel was created
		const confirmationMessage = await interaction.channel.send({
			content: `✅ **New ticket channel created:** <#${newTicketChannel.id}>`
		})

		// Remove the confirmation message after 5 seconds
		setTimeout(async () => {
			try {
				await confirmationMessage.delete()
				logger.info('Deleted confirmation message for new ticket channel.')
			} catch (error) {
				logger.error('Error deleting confirmation message:', error)
			}
		}, 5000)

		logger.info(
			`Created new ticket channel #${newTicketChannel.name} under "Tickit" category in guild: ${interaction.guild.name}`
		)
	} catch (error) {
		logger.error('Error creating new ticket channel:', error)

		// Notify the user of the error
		const errorMessage = await interaction.channel.send({
			content: '❌ **An error occurred while creating the ticket channel. Please try again later.**'
		})

		// Remove the error message after 4 seconds
		setTimeout(async () => {
			try {
				await errorMessage.delete()
				logger.info('Deleted error message for ticket channel creation failure.')
			} catch (error) {
				logger.error('Error deleting error message:', error)
			}
		}, 4000)
	}
}

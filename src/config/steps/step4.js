import {
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ChannelType,
	TextInputBuilder,
	TextInputStyle,
	ModalBuilder
} from 'discord.js'

import { logger } from 'robo.js'

export async function step4(channelOrInteraction, action, ticketChannel = null) {
	try {
		switch (action) {
			case 'check-panel':
				await checkAndSetupPanel(channelOrInteraction, ticketChannel)
				break

			case 'setup':
				await setupTicketPanel(channelOrInteraction, ticketChannel)
				break

			case 'edit':
				await editTicketPanel(channelOrInteraction)
				break

			case 'modal-submit':
				await handleModalSubmit(channelOrInteraction)
				break

			default:
				logger.error(`Unknown action for step4: ${action}`)
		}
	} catch (error) {
		logger.error(`Error in step4 (${action}):`, error)

		if (channelOrInteraction.reply && !channelOrInteraction.replied && !channelOrInteraction.deferred) {
			await channelOrInteraction.reply({
				content: '❌ **An error occurred while managing the ticket panel. Please try again later.**',
				ephemeral: true
			})
		}
	}
}

async function checkAndSetupPanel(configChannel, ticketChannel) {
	if (!ticketChannel) {
		logger.warn('No ticket channel provided to checkAndSetupPanel')

		// Attempt to retrieve from storage as fallback
		if (storedChannelId) {
			ticketChannel = configChannel.guild.channels.cache.get(storedChannelId)
			if (ticketChannel) {
				logger.info(`Retrieved stored channel: #${ticketChannel.name} (${storedChannelId})`)
			} else {
				logger.warn(`Stored channel ID ${storedChannelId} not found in cache`)
			}
		}

		// If still no channel, exit gracefully
		if (!ticketChannel) {
			logger.error('Ticket channel is undefined and not found in storage')
			await configChannel.send({
				content: '❌ **Error: Ticket channel not found. Please re-run Step 3.**'
			})
			return
		}
	}

	logger.info(`Checking for existing ticket panel in channel: #${ticketChannel.name} (${ticketChannel.id})`)

	try {
		// Fetch messages with detailed logging
		const fetchOptions = { limit: 10 }
		logger.info(`Fetching messages with options:`, fetchOptions)

		const messages = await ticketChannel.messages.fetch(fetchOptions)
		logger.info(`Successfully fetched ${messages.size} messages from channel`)

		// Check if ticket panel already exists
		const ticketPanelExists = messages.some((message) =>
			message.embeds.some(
				(embed) => embed.title === '🎫 Ticket Panel' || (embed.title && embed.title.includes('Ticket Panel'))
			)
		)

		logger.info(`Ticket panel exists check result: ${ticketPanelExists}`)

		if (ticketPanelExists) {
			logger.info(`Ticket panel already exists in channel #${ticketChannel.name}`)

			const notificationMessage = await configChannel.send({
				content: `ℹ️ **A ticket panel already exists in <#${ticketChannel.id}>**`
			})

			setTimeout(async () => {
				try {
					await notificationMessage.delete()
				} catch (error) {
					logger.error('Error deleting notification message:', error)
				}
			}, 5000)
			return
		}

		// Check if Step 4 instruction already exists
		const configMessages = await configChannel.messages.fetch({ limit: 20 })
		const step4Exists = configMessages.some((message) =>
			message.embeds.some((embed) => embed.title === 'Step 4: Ticket Panel Setup')
		)

		if (step4Exists) {
			logger.info(`Step 4 instruction message already exists in configuration channel`)
			return
		}

		// Send Step 4 instructions with channel mention
		const step4InstructionEmbed = new EmbedBuilder()
			.setColor('c1daa1')
			.setTitle('Step 4: Ticket Panel Setup')
			.setDescription(
				`🎫 **Now it's time to set up your ticket panel!**\n\n` +
					`The ticket panel is what users will interact with to create tickets. ` +
					`It will be created in <#${ticketChannel.id}>.\n\n` +
					`By default, we provide a standard ticket panel, but you can customize it later to match your server's needs.\n\n` +
					`Click the **Setup Ticket Panel** button below to create the default ticket panel.`
			)
			.setFooter({ text: '🔄 You can edit the panel after setup.' })

		// Create button with channel ID embedded in customId
		const setupButton = new ButtonBuilder()
			.setCustomId(`setup-ticket-panel:${ticketChannel.id}`)
			.setLabel(`Setup Panel in #${ticketChannel.name}`)
			.setStyle(ButtonStyle.Success)
			.setEmoji('🎫')

		const setupRow = new ActionRowBuilder().addComponents(setupButton)

		await configChannel.send({
			embeds: [step4InstructionEmbed],
			components: [setupRow]
		})

		logger.info(`Sent ticket panel setup instructions for channel #${ticketChannel.name}`)
	} catch (error) {
		logger.error(`Failed to fetch messages from channel ${ticketChannel.id}:`, error)
		throw error
	}
}

async function editTicketPanel(editInteraction) {
	const modal = new ModalBuilder().setCustomId('edit-ticket-panel-modal').setTitle('Edit Ticket Panel')

	const titleInput = new TextInputBuilder()
		.setCustomId('ticket-panel-title')
		.setLabel('Ticket Panel Title')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('Enter the title for the ticket panel')
		.setRequired(true)

	const descriptionInput = new TextInputBuilder()
		.setCustomId('ticket-panel-description')
		.setLabel('Ticket Panel Description')
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder('Enter the description for the ticket panel')
		.setRequired(true)

	const titleRow = new ActionRowBuilder().addComponents(titleInput)
	const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput)

	modal.addComponents(titleRow, descriptionRow)

	await editInteraction.showModal(modal)
}

async function handleModalSubmit(modalInteraction) {
	const title = modalInteraction.fields.getTextInputValue('ticket-panel-title')
	const description = modalInteraction.fields.getTextInputValue('ticket-panel-description')

	const ticketChan = modalInteraction.guild.channels.cache.find(
		(channel) => channel.name === '🎫-create-a-ticket' && channel.type === ChannelType.GuildText
	)

	if (!ticketChan) {
		await modalInteraction.reply({
			content: '❌ **The ticket channel does not exist. Please create it first.**',
			ephemeral: true
		})
		return
	}

	const ticketMessages = await ticketChan.messages.fetch({ limit: 10 })
	const ticketPanelMessage = ticketMessages.find((message) =>
		message.embeds.some((embed) => embed.title && embed.title.includes('Ticket Panel'))
	)

	if (!ticketPanelMessage) {
		await modalInteraction.reply({
			content: '❌ **The ticket panel message could not be found. Please set it up first.**',
			ephemeral: true
		})
		return
	}

	const updatedEmbed = new EmbedBuilder()
		.setColor('5865F2')
		.setTitle(title)
		.setDescription(description)
		.setFooter({ text: 'Powered by Tickit' })

	await ticketPanelMessage.edit({ embeds: [updatedEmbed] })

	await modalInteraction.reply({
		content: '✅ **The ticket panel has been updated successfully.**',
		ephemeral: true
	})

	logger.info(`Ticket panel updated in channel #${ticketChan.name} in guild: ${modalInteraction.guild.name}`)
}

async function setupTicketPanel(configChannel, ticketChannel) {
	if (!ticketChannel) {
		logger.error('No ticket channel provided to setupTicketPanel')
		await configChannel.send({
			content: '❌ **Error: Ticket channel not found. Please re-run Step 3.**'
		})
		return
	}

	try {
		logger.info(`Setting up ticket panel in channel: #${ticketChannel.name} (${ticketChannel.id})`)

		// Check if panel already exists in the target channel
		const messages = await ticketChannel.messages.fetch({ limit: 10 })
		const existingPanel = messages.find((message) =>
			message.embeds.some(
				(embed) => embed.title === '🎫 Ticket Panel' || (embed.title && embed.title.includes('Ticket Panel'))
			)
		)

		if (existingPanel) {
			logger.info(`Ticket panel already exists in #${ticketChannel.name}`)
			const notificationMessage = await configChannel.send({
				content: `ℹ️ **A ticket panel already exists in <#${ticketChannel.id}>**`
			})

			setTimeout(async () => {
				try {
					await notificationMessage.delete()
				} catch (error) {
					logger.error('Error deleting notification message:', error)
				}
			}, 5000)
			return
		}

		// Create the actual ticket panel embed
		const panelEmbed = new EmbedBuilder()
			.setColor('5865F2')
			.setTitle('🎫 Ticket Panel')
			.setDescription(
				'Click the button below to create a new support ticket.\n\n' +
					'Our support team will assist you as soon as possible.\n\n' +
					'*Please provide detailed information about your issue.*'
			)
			.setFooter({ text: 'Powered by Tickit' })
			.setTimestamp()

		// Create the create ticket button
		const createButton = new ButtonBuilder()
			.setCustomId('create-ticket')
			.setLabel('Create Ticket')
			.setStyle(ButtonStyle.Primary)
			.setEmoji('🎫')

		const row = new ActionRowBuilder().addComponents(createButton)

		// Send the panel to the ticket channel
		await ticketChannel.send({
			embeds: [panelEmbed],
			components: [row]
		})

		// Send confirmation to config channel
		const successMessage = await configChannel.send({
			content: `✅ **Ticket panel successfully created in <#${ticketChannel.id}>**`
		})

		setTimeout(async () => {
			try {
				await successMessage.delete()
			} catch (error) {
				logger.error('Error deleting success message:', error)
			}
		}, 5000)

		logger.info(`Ticket panel created in #${ticketChannel.name} in guild: ${configChannel.guild.name}`)
	} catch (error) {
		logger.error(`Error setting up ticket panel in #${ticketChannel.name}:`, error)

		const errorMessage = await configChannel.send({
			content: '❌ **An error occurred while creating the ticket panel. Please try again.**'
		})

		setTimeout(async () => {
			try {
				await errorMessage.delete()
			} catch (err) {
				logger.error('Error deleting error message:', err)
			}
		}, 5000)

		throw error
	}
}

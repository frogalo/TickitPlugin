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

import { logger, Flashcore } from 'robo.js'

export async function step4(channelOrInteraction, action) {
	try {
		switch (action) {
			case 'check-panel':
				await checkAndSetupPanel(channelOrInteraction)
				break

			case 'setup':
				await setupTicketPanel(channelOrInteraction)
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

async function checkAndSetupPanel(interaction) {
	const configChannel = await getConfigChannel(interaction.guild)
	if (!configChannel) return

	const ticketChannel = await getTicketChannel(interaction.guild, interaction)
	if (!ticketChannel) return

	logger.info(`Checking for existing ticket panel in channel: #${ticketChannel.name} (${ticketChannel.id})`)

	try {
		// Fetch messages to check for existing panel
		const fetchOptions = { limit: 10 }
		const messages = await ticketChannel.messages.fetch(fetchOptions)
		
		// Check if ticket panel already exists
		const ticketPanelExists = messages.some((message) =>
			message.embeds.some(
				(embed) => embed.title === '🎫 Ticket Panel' || (embed.title && embed.title.includes('Ticket Panel'))
			)
		)

		logger.info(`Ticket panel exists check result: ${ticketPanelExists}`)

		// Update Flashcore with current state
		await Flashcore.set('ticket-panel-exists', ticketPanelExists, { namespace: interaction.guild.id })

		// Prepare the Embed and Components based on state
		let step4Embed
		let step4Row

		if (ticketPanelExists) {
			step4Embed = new EmbedBuilder()
				.setColor('c1daa1')
				.setTitle('Step 4: Ticket Panel Setup')
				.setDescription(
					`ℹ️ **A ticket panel already exists in <#${ticketChannel.id}>**\n\n` +
					`You can edit the existing panel by clicking the button below.`
				)
				.setFooter({ text: '🔄 You can edit the panel anytime.' })

			const editButton = new ButtonBuilder()
				.setCustomId(`edit-ticket-panel:${ticketChannel.id}`)
				.setLabel(`Edit Panel in #${ticketChannel.name}`)
				.setStyle(ButtonStyle.Primary)
				.setEmoji('✏️')

			step4Row = new ActionRowBuilder().addComponents(editButton)
		} else {
			step4Embed = new EmbedBuilder()
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

			const setupButton = new ButtonBuilder()
				.setCustomId(`setup-ticket-panel:${ticketChannel.id}`)
				.setLabel(`Setup Panel in #${ticketChannel.name}`)
				.setStyle(ButtonStyle.Success)
				.setEmoji('🎫')

			step4Row = new ActionRowBuilder().addComponents(setupButton)
		}

		// Check if Step 4 instruction already exists in config channel
		const configMessages = await configChannel.messages.fetch({ limit: 20 })
		const existingStep4Message = configMessages.find((message) =>
			message.embeds.some((embed) => embed.title === 'Step 4: Ticket Panel Setup')
		)

		if (existingStep4Message) {
			await existingStep4Message.edit({
				embeds: [step4Embed],
				components: [step4Row]
			})
			logger.info(`Updated existing Step 4 message for channel #${ticketChannel.name}`)
		} else {
			await configChannel.send({
				embeds: [step4Embed],
				components: [step4Row]
			})
			logger.info(`Sent new Step 4 message for channel #${ticketChannel.name}`)
		}

	} catch (error) {
		logger.error(`Failed to check/setup panel for channel ${ticketChannel.id}:`, error)
		throw error
	}
}

async function editTicketPanel(editInteraction) {
	const ticketChannel = await getTicketChannel(editInteraction.guild, editInteraction)
	if (!ticketChannel) return

	const modal = new ModalBuilder()
		.setCustomId(`edit-ticket-panel-modal:${ticketChannel.id}`)
		.setTitle('Edit Ticket Panel')

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
	const { customId } = modalInteraction

	// Parse channel ID from modal customId
	const parts = customId.split(':')
	const channelId = parts[1]

	let ticketChan = null

	if (channelId) {
		ticketChan = modalInteraction.guild.channels.cache.get(channelId)
	}

	// Fallback to old method if channel not found
	if (!ticketChan) {
		ticketChan = modalInteraction.guild.channels.cache.find(
			(channel) => channel.name === '🎫-create-a-ticket' && channel.type === ChannelType.GuildText
		)
	}

	if (!ticketChan) {
		await modalInteraction.reply({
			content: '❌ **The ticket channel does not exist. Please create it first.**',
			ephemeral: true
		})
		return
	}

	const title = modalInteraction.fields.getTextInputValue('ticket-panel-title')
	const description = modalInteraction.fields.getTextInputValue('ticket-panel-description')

	const ticketMessages = await ticketChan.messages.fetch({ limit: 10 })
	const ticketPanelMessage = ticketMessages.find((message) =>
		message.embeds.some((embed) => embed.title && embed.title.includes('Ticket Panel'))
	)

	if (!ticketPanelMessage) {
		// Panel not found - delete all messages and create new one
		logger.warn(`Ticket panel not found in #${ticketChan.name}, purging and recreating...`)

		try {
			// Verify channel type
			if (ticketChan.type !== ChannelType.GuildText) {
				await modalInteraction.reply({
					content: '❌ **Cannot modify this channel type.**',
					ephemeral: true
				})
				return
			}

			// Fetch up to 100 messages
			const allMessages = await ticketChan.messages.fetch({ limit: 100 })

			// Bulk delete messages < 14 days old
			const deletable = allMessages.filter(msg =>
				Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
			)
			if (deletable.size > 0) {
				await ticketChan.bulkDelete(deletable)
			}

			// Delete older messages individually (best effort)
			const oldMessages = allMessages.filter(msg =>
				Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
			)
			for (const msg of oldMessages.values()) {
				try { await msg.delete() } catch {}
			}

			// Create and send new panel
			const newPanelEmbed = new EmbedBuilder()
				.setColor('5865F2')
				.setTitle(title)
				.setDescription(description)
				.setFooter({ text: 'Powered by Tickit' })
				.setTimestamp()

			const createButton = new ButtonBuilder()
				.setCustomId('create-ticket')
				.setLabel('Create Ticket')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('🎫')

			const row = new ActionRowBuilder().addComponents(createButton)

			await ticketChan.send({
				embeds: [newPanelEmbed],
				components: [row]
			})

			await modalInteraction.reply({
				content: '✅ **Panel edited successfully!**',
				ephemeral: true
			})

			setTimeout(() => {
				modalInteraction.deleteReply().catch((err) => logger.error('Failed to delete reply:', err))
			}, 3000)

			logger.info(`Recreated ticket panel in #${ticketChan.name}`)
			return

		} catch (error) {
			logger.error(`Error recreating panel in #${ticketChan.name}:`, error)
			await modalInteraction.reply({
				content: '❌ **Failed to recreate panel. Check permissions.**',
				ephemeral: true
			})
			return
		}
	}

	// Panel found - update existing
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

	setTimeout(() => {
		modalInteraction.deleteReply().catch((err) => logger.error('Failed to delete reply:', err))
	}, 3000)

	logger.info(`Ticket panel updated in channel #${ticketChan.name} in guild: ${modalInteraction.guild.name}`)
}

async function setupTicketPanel(interaction) {
	const configChannel = await getConfigChannel(interaction.guild)
	if (!configChannel) return

	const ticketChannel = await getTicketChannel(interaction.guild, interaction)
	if (!ticketChannel) return

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
			await replaceSetupButtonWithEdit(interaction)
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

		// Replace setup button with edit button
		await replaceSetupButtonWithEdit(interaction)

		// Update Flashcore to reflect that panel now exists
		await Flashcore.set('ticket-panel-exists', true, { namespace: interaction.guild.id })

		logger.info(`Ticket panel created in #${ticketChannel.name} in guild: ${interaction.guild.name}`)
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

/**
 * Replaces the setup button with an edit button in the config channel
 * @param {TextChannel} configChannel - The channel containing the setup message
 * @param {GuildChannel} ticketChannel - The ticket channel that was set up
 */
async function replaceSetupButtonWithEdit(interaction) {
	const configChannel = await getConfigChannel(interaction.guild)
	if (!configChannel) return

	const ticketChannel = await getTicketChannel(interaction.guild, interaction)
	if (!ticketChannel) return
	try {
		logger.info(`Replacing setup button with edit button for channel #${ticketChannel.name}`)

		// Find the setup message by searching for the button with this channel ID
		const messages = await configChannel.messages.fetch({ limit: 20 })

		// Look for message containing the setup button for this channel
		const setupMessage = messages.find((msg) =>
			msg.components.some((row) =>
				row.components.some((component) => component.customId === `setup-ticket-panel:${ticketChannel.id}`)
			)
		)

		if (!setupMessage) {
			logger.warn(`Could not find setup message for channel #${ticketChannel.name}`)
			return
		}

		// Create the edit button
		const editButton = new ButtonBuilder()
			.setCustomId(`edit-ticket-panel:${ticketChannel.id}`)
			.setLabel(`Edit Button - ${ticketChannel.name}`)
			.setStyle(ButtonStyle.Primary)
			.setEmoji('✏️')

		const editRow = new ActionRowBuilder().addComponents(editButton)

		// Edit the message to replace the button
		await setupMessage.edit({ components: [editRow] })

		logger.info(`Successfully replaced setup button with edit button for #${ticketChannel.name}`)
	} catch (error) {
		logger.error(`Error replacing setup button for channel #${ticketChannel.name}:`, error)
	}
}

async function getTicketChannel(guild, notifyTarget = null) {
	const channelId = await Flashcore.get('ticket-channel', { namespace: guild.id })
	let ticketChannel = null

	if (channelId) {
		try {
			ticketChannel = await guild.channels.fetch(channelId)
		} catch (error) {
			// Channel might be deleted or inaccessible
		}
	}

	if (!ticketChannel && notifyTarget) {
		logger.error('No ticket channel provided and not found in Flashcore')
		const content = '❌ **Error: Ticket channel not found. Please re-run Step 3.**'

		if (notifyTarget.reply && !notifyTarget.replied && !notifyTarget.deferred) {
			await notifyTarget.reply({
				content,
				ephemeral: true
			})
		} else if (notifyTarget.send) {
			await notifyTarget.send({
				content
			})
		}
	}

	return ticketChannel
}

async function getConfigChannel(guild) {
	const channelId = await Flashcore.get('config-channel', { namespace: guild.id })
	if (!channelId) return null
	try {
		return await guild.channels.fetch(channelId)
	} catch (error) {
		return null
	}
}

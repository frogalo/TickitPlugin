import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ChannelType } from 'discord.js'
import { logger, Flashcore } from 'robo.js'
import { step4 } from './step4.js'

export async function step3(channelOrInteraction, action) {
	try {
		switch (action) {
			case 'initialize':
				await sendChannelSetup(channelOrInteraction)
				break

			case 'create-new':
				await handleCreateNewChannel(channelOrInteraction)
				break

			case 'use-existing':
				await handleUseExisting(channelOrInteraction)
				break

			case 'existing-channel-selection':
				await handleChannelSelection(channelOrInteraction)
				break

			default:
				logger.error(`Unknown action for step3: ${action}`)
		}
	} catch (error) {
		logger.error(`Error in step3 (${action}):`, error)

		if (channelOrInteraction.reply && !channelOrInteraction.replied) {
			const errorMessage = await channelOrInteraction.channel.send({
				content: '❌ **An error occurred while setting up the channel. Please try again later.**'
			})

			setTimeout(async () => {
				try {
					await errorMessage.delete()
				} catch (err) {
					logger.error('Error deleting error message:', err)
				}
			}, 4000)
		}
	}
}

async function sendChannelSetup(channel) {
	const channelEmbed = new EmbedBuilder()
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
				"Make sure the selected channel is accessible to your users and fits your server's structure.\n\n" +
				'Choose an option below to proceed.'
		)
		.setFooter({ text: '🔄 You can change this anytime.' })

	const channelMenu = new StringSelectMenuBuilder()
		.setCustomId('channel-selection')
		.setPlaceholder('Select Channel Option')
		.addOptions([
			{
				label: 'Create a new channel',
				description: 'Create a dedicated "create-a-ticket" channel',
				value: 'new-channel',
				emoji: '📝'
			},
			{
				label: 'Use existing channel',
				description: 'Select an existing channel for tickets',
				value: 'existing-channel',
				emoji: '🔍'
			}
		])

	const channelRow = new ActionRowBuilder().addComponents(channelMenu)

	await channel.send({ embeds: [channelEmbed], components: [channelRow] })
	logger.info('Sent channel setup message')
}

async function handleCreateNewChannel(interaction) {
	try {
		const guild = interaction.guild
		const configChannel = interaction.channel

		let tickitCategory = guild.channels.cache.find(
			(channel) => channel.name === 'Tickit' && channel.type === ChannelType.GuildCategory
		)

		if (!tickitCategory) {
			tickitCategory = await guild.channels.create({
				name: 'Tickit',
				type: ChannelType.GuildCategory
			})
			logger.info(`Created "Tickit" category in guild: ${guild.name}`)
		}

		const existingTicketChannel = guild.channels.cache.find(
			(channel) => channel.name === '🎫-create-a-ticket' && channel.parentId === tickitCategory.id
		)

		if (existingTicketChannel) {
			const notificationMessage = await configChannel.send({
				content: `⚠️ **The ticket channel already exists:** <#${existingTicketChannel.id}>`
			})

			setTimeout(async () => {
				try {
					await notificationMessage.delete()
					logger.info('Deleted notification message for existing ticket channel.')
				} catch (error) {
					logger.error('Error deleting notification message:', error)
				}
			}, 5000)

			await Flashcore.set('config-channel', configChannel.id, { namespace: guild.id })
			await Flashcore.set('ticket-channel', existingTicketChannel.id, { namespace: guild.id })
			// Check if ticket panel exists
			const channelMessages = await existingTicketChannel.messages.fetch({ limit: 10 })
			const ticketPanelExists = channelMessages.some((message) =>
				message.embeds.some(
					(embed) => embed.title === '🎫 Ticket Panel' || (embed.title && embed.title.includes('Ticket Panel'))
				)
			)
			await Flashcore.set('ticket-panel-exists', ticketPanelExists, { namespace: guild.id })

			await step4(interaction, 'check-panel')

			await interaction.deferUpdate()
			return
		}

		const newTicketChannel = await guild.channels.create({
			name: '🎫-create-a-ticket',
			type: ChannelType.GuildText,
			parent: tickitCategory.id,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					allow: ['ViewChannel', 'SendMessages']
				}
			]
		})
		const confirmationMessage = await configChannel.send({
			content: `✅ **New ticket channel created:** <#${newTicketChannel.id}>`
		})

		setTimeout(async () => {
			try {
				await confirmationMessage.delete()
				logger.info('Deleted confirmation message for new ticket channel.')
			} catch (error) {
				logger.error('Error deleting confirmation message:', error)
			}
		}, 4500)

		logger.info(`Created new ticket channel #${newTicketChannel.name} in guild: ${guild.name}`)

		// Check if Step 4 already exists
		const configMessages = await configChannel.messages.fetch({ limit: 10 })
		const step4Exists = configMessages.some((message) =>
			message.embeds.some((embed) => embed.title === 'Step 4: Ticket Panel Setup')
		)

		// Always update Step 4, whether it exists or not
		// Check if ticket panel exists (unlikely for new channel, but good practice)
		const channelMessages = await newTicketChannel.messages.fetch({ limit: 10 })
		const ticketPanelExists = channelMessages.some((message) =>
			message.embeds.some(
				(embed) => embed.title === '🎫 Ticket Panel' || (embed.title && embed.title.includes('Ticket Panel'))
			)
		)

		await Flashcore.set('config-channel', configChannel.id, { namespace: guild.id })
		await Flashcore.set('ticket-channel', newTicketChannel.id, { namespace: guild.id })
		await Flashcore.set('ticket-panel-exists', ticketPanelExists, { namespace: guild.id })

		// Always update Step 4, whether it exists or not
		await step4(interaction, 'check-panel')
		
		await interaction.deferUpdate()
		logger.info(`Channel created in guild: ${guild.name}`)
	} catch (error) {
		logger.error('Error in handleCreateNewChannel:', error)
		throw error
	}
}

async function handleUseExisting(interaction) {
	try {
		const channels = await interaction.guild.channels.fetch()
		const textChannels = channels.filter((channel) => channel.type === ChannelType.GuildText)

		if (!textChannels.size) {
			await interaction.update({
				content: '❌ No text channels found in this server.',
				embeds: [],
				components: []
			})
			return
		}

		const channelSelect = new StringSelectMenuBuilder()
			.setCustomId('existing-channel-selection')
			.setPlaceholder('Select a channel')
			.addOptions({
				label: 'Cancel',
				description: 'Cancel channel selection',
				value: 'cancel',
				emoji: '❌'
			})

		textChannels.first(24).forEach((channel) => {
			channelSelect.addOptions({
				label: channel.name.length > 25 ? channel.name.substring(0, 22) + '...' : channel.name,
				description: `Select #${channel.name.substring(0, 45)}`,
				value: channel.id,
				emoji: '📝'
			})
		})

		const selectRow = new ActionRowBuilder().addComponents(channelSelect)

		// Keep the original embed and just update the components
		await interaction.update({
			components: [selectRow]
		})

		logger.info(`Displayed channel selection menu in guild: ${interaction.guild.name}`)
	} catch (error) {
		logger.error('Error in step3 (use-existing):', error)

		if (!interaction.replied && !interaction.deferred) {
			await interaction.update({
				content: '❌ An error occurred while loading channels. Please try again.',
				embeds: [],
				components: []
			})
		}
	}
}

//todo: if step 4 already exists step 3 needs to cancel step 4
async function handleChannelSelection(interaction) {
	if (interaction.values[0] === 'cancel') {
		const originalMenu = new StringSelectMenuBuilder()
			.setCustomId('channel-selection')
			.setPlaceholder('Select Channel Option')
			.addOptions([
				{
					label: 'Create a new channel',
					description: 'Create a dedicated "create-a-ticket" channel',
					value: 'new-channel',
					emoji: '📝'
				},
				{
					label: 'Use existing channel',
					description: 'Select an existing channel for tickets',
					value: 'existing-channel',
					emoji: '🔍'
				}
			])

		const resetRow = new ActionRowBuilder().addComponents(originalMenu)

		await interaction.update({
			components: [resetRow]
		})
		return
	}

	try {
		const configChannel = interaction.channel
		const selectedChannel = interaction.guild.channels.cache.get(interaction.values[0])
		if (!selectedChannel) {
			await interaction.reply({
				content: '❌ Selected channel not found.',
				ephemeral: true
			})
			return
		}

		// Send temporary notification message
		const notificationMessage = await configChannel.send({
			content: `✅ **Ticket channel has been selected:** <#${selectedChannel.id}>`
		})


		setTimeout(async () => {
			try {
				await notificationMessage.delete()
				logger.info('Deleted notification message for selected ticket channel.')
			} catch (error) {
				logger.error('Error deleting notification message:', error)
			}
		}, 5000)

		// Check if Step 4 already exists
		const configMessages = await configChannel.messages.fetch({ limit: 10 })
		const step4Exists = configMessages.some((message) =>
			message.embeds.some((embed) => embed.title === 'Step 4: Ticket Panel Setup')
		)

		// Always update Step 4, whether it exists or not
		// Check if ticket panel exists
		const channelMessages = await selectedChannel.messages.fetch({ limit: 10 })
		const ticketPanelExists = channelMessages.some((message) =>
			message.embeds.some(
				(embed) => embed.title === '🎫 Ticket Panel' || (embed.title && embed.title.includes('Ticket Panel'))
			)
		)

		await Flashcore.set('config-channel', configChannel.id, { namespace: interaction.guild.id })
		await Flashcore.set('ticket-channel', selectedChannel.id, { namespace: interaction.guild.id })
		await Flashcore.set('ticket-panel-exists', ticketPanelExists, { namespace: interaction.guild.id })

		// Always update Step 4, whether it exists or not
		await step4(interaction, 'check-panel')

		await interaction.deferUpdate()
		logger.info(`Selected existing channel #${selectedChannel.name} for tickets in guild: ${interaction.guild.name}`)
	} catch (error) {
		logger.error('Error in handleChannelSelection:', error)

		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: '❌ An error occurred. Please try again.',
				ephemeral: true
			})
		}
	}
}

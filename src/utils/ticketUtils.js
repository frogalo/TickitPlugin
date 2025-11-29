import {
	ChannelType,
	PermissionFlagsBits,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder
} from 'discord.js'
import { logger, Flashcore } from 'robo.js'
import { INTERACTION_IDS, TICKET_CONFIG } from '../config/constants.js'

export async function createTicket(interaction) {
	try {
		const guild = interaction.guild
		const user = interaction.user

		// 1. Get Ticket Manager Role
		const ticketManagerRoleId = await Flashcore.get('ticket-manager-role', { namespace: guild.id })
		if (!ticketManagerRoleId) {
			return interaction.reply({
				content: '❌ **Ticket Manager role not configured. Please contact an administrator.**',
				ephemeral: true
			})
		}

		// 2. Determine Category
		let categoryId = interaction.channel.parentId
		if (!categoryId) {
			const tickitCategory = guild.channels.cache.find(
				(c) => c.name === TICKET_CONFIG.CATEGORY_NAME && c.type === ChannelType.GuildCategory
			)
			if (tickitCategory) categoryId = tickitCategory.id
		}

		// 3. Create Ticket Channel
		let channelName = `${TICKET_CONFIG.CHANNEL_PREFIX}${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '')
		
		// Check for duplicates and append number if necessary
		let counter = 1
		let originalName = channelName
		while (guild.channels.cache.some(c => c.name === channelName)) {
			channelName = `${originalName}-${counter}`
			counter++
		}
		
		const ticketChannel = await guild.channels.create({
			name: channelName,
			type: ChannelType.GuildText,
			parent: categoryId,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: [PermissionFlagsBits.ViewChannel]
				},
				{
					id: ticketManagerRoleId,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
				},
				{
					id: user.id,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
				}
			]
		})

		// 4. Save Ticket Data to Flashcore
		const ticketData = {
			ownerId: user.id,
			status: 'open',
			createdAt: Date.now(),
			channelId: ticketChannel.id
		}
		await Flashcore.set(`ticket-${ticketChannel.id}`, ticketData, { namespace: guild.id })

		// 5. Send Initial Embed
		const embed = new EmbedBuilder()
			.setColor('5865F2')
			.setTitle('Ticket Support')
			.setDescription(
				`Hello <@${user.id}>,\n\n` +
				`Thank you for reaching out! Our support team has been notified.\n\n` +
				`**Please describe your issue in detail so we can assist you better.**\n` +
				`• What is the problem?\n` +
				`• When did it start?\n` +
				`• Any screenshots or error codes?`
			)
			.setFooter({ text: 'Powered by Tickit' })
			.setTimestamp()

		const closeButton = new ButtonBuilder()
			.setCustomId(INTERACTION_IDS.CLOSE_TICKET)
			.setLabel('Close Ticket')
			.setStyle(ButtonStyle.Danger)
			.setEmoji('🔒')

		// const claimButton = new ButtonBuilder()
		// 	.setCustomId(INTERACTION_IDS.CLAIM_TICKET)
		// 	.setLabel('Claim Ticket')
		// 	.setStyle(ButtonStyle.Secondary)
		// 	.setEmoji('🙋‍♂️')

		// const row = new ActionRowBuilder().addComponents(closeButton, claimButton)
		const row = new ActionRowBuilder().addComponents(closeButton)

		await ticketChannel.send({
			content: `<@${user.id}> <@&${ticketManagerRoleId}>`,
			embeds: [embed],
			components: [row]
		})

		// 6. Reply to User
		await interaction.reply({
			content: `✅ **Ticket created successfully!** <#${ticketChannel.id}>`,
			ephemeral: true
		})

		setTimeout(() => {
			interaction.deleteReply().catch((err) => logger.error('Failed to delete reply:', err))
		}, 3000)

		logger.info(`Created ticket #${ticketChannel.name} for user ${user.username} in guild ${guild.name}`)

	} catch (error) {
		logger.error('Error creating ticket:', error)
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: '❌ **Failed to create ticket. Please try again later.**',
				ephemeral: true
			})
		}
	}
}

export async function closeTicket(interaction) {
	const channel = interaction.channel
	const guild = interaction.guild

	try {
		// Verify this is actually a ticket channel
		const ticketData = await Flashcore.get(`ticket-${channel.id}`, { namespace: guild.id })
		if (!ticketData) {
			return interaction.reply({
				content: '❌ **This channel is not a recognized ticket.**',
				ephemeral: true
			})
		}

		await interaction.reply({
			content: '🔒 **Closing ticket...**'
		})

		// Delete from Flashcore
		await Flashcore.delete(`ticket-${channel.id}`, { namespace: guild.id })

		// Delete Channel (with a small delay to allow the reply to be seen)
		setTimeout(async () => {
			try {
				await channel.delete()
				logger.info(`Closed ticket #${channel.name} in guild ${guild.name}`)
			} catch (error) {
				logger.error(`Failed to delete channel ${channel.name}:`, error)
			}
		}, 3000)

	} catch (error) {
		logger.error('Error closing ticket:', error)
		await interaction.reply({
			content: '❌ **Failed to close ticket.**',
			ephemeral: true
		})
	}
}

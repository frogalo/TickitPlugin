import { EmbedBuilder } from 'discord.js'
import { Flashcore, createCommandConfig } from 'robo.js'

export const config = createCommandConfig({
	description: 'Get help with the ticket system'
})

export default async (interaction) => {
	try {
		const guild = interaction.guild
		const member = interaction.member

		// Fetch the configured ticket manager role
		const ticketManagerRoleId = await Flashcore.get('ticket-manager-role', { namespace: guild.id })
		const isTicketManager = ticketManagerRoleId && member.roles.cache.has(ticketManagerRoleId)

		const embed = new EmbedBuilder()
			.setColor('5865F2')
			.setTitle('🎫 Tickit Help')
			.setFooter({ text: 'Powered by Tickit' })
			.setTimestamp()

		// General Help (For Everyone)
		let description =
			`**How to use Tickit**\n\n` +
			`**1. Creating a Ticket**\n` +
			`Go to the ticket panel channel and click the **"Create Ticket"** button. ` +
			`A private channel will be created for you to discuss your issue with the support team.\n\n` +
			`**2. Managing Your Ticket**\n` +
			`Once inside your ticket channel, you can communicate with the staff. ` +
			`When your issue is resolved, you can click the **"Close Ticket"** button to archive it.`

		// Admin Help (For Ticket Managers)
		if (isTicketManager) {
			description +=
				`\n\n----------------------------------\n\n` +
				`**🛡️ Admin / Staff Guide**\n\n` +
				`**Configuration**\n` +
				`Use \`/tickitconfig\` to set up or modify the bot settings (Role, Channel, Panel).\n\n` +
				`**⚠️ IMPORTANT WARNING**\n` +
				`**DO NOT manually delete ticket channels!**\n` +
				`Always use the **"Close Ticket"** button inside the channel. ` +
				`Manually deleting channels will break the database synchronization and prevent transcripts from being saved correctly.\n\n` +
				`**Managing Tickets**\n` +
				`• **Claim Ticket**: Assigns the ticket to you (Coming Soon).\n` +
				`• **Close Ticket**: Safely closes and deletes the ticket channel.`
		}

		embed.setDescription(description)

		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		})
	} catch (error) {
		await interaction.reply({
			content: '❌ An error occurred while fetching help.',
			ephemeral: true
		})
	}
}

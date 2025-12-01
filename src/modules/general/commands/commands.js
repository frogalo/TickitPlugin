import { createCommandConfig, Flashcore } from 'robo.js'
import { EmbedBuilder } from 'discord.js'

export const config = createCommandConfig({
	description: 'List all available commands (Admin Only)'
})

export default async (interaction) => {
	try {
		const guild = interaction.guild
		const member = interaction.member

		// Check for Ticket Manager Role
		const ticketManagerRoleId = await Flashcore.get('ticket-manager-role', { namespace: guild.id })
		const isTicketManager = ticketManagerRoleId && member.roles.cache.has(ticketManagerRoleId)

		const embed = new EmbedBuilder()
			.setColor('5865F2')
			.setTitle('📜 Available Commands')
			.setDescription('List of all commands available in the Tickit plugin.')
			.setFooter({ text: 'Powered by Tickit' })
			.setTimestamp()

		const fields = [
			{
				name: 'ℹ️ /help',
				value: 'Displays help information about using the ticket system. Shows extra info for admins.'
			},
			// {
			// 	name: '➕ /ticket-add [user]',
			// 	value: 'Adds a specific user to the current ticket channel.'
			// },
			{
				name: '🔒 /ticket-close',
				value: 'Closes the current ticket channel (same as clicking the Close button).'
			},
			{
				name: '📜 /commands',
				value: 'Displays this list of commands.'
			}
		]

		if (isTicketManager) {
			fields.splice(1, 0, {
				name: '⚙️ /tickitconfig',
				value: 'Displays the current configuration settings (Role, Channels).'
			})
		}

		embed.addFields(fields)

		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		})
	} catch (error) {
		await interaction.reply({
			content: '❌ An error occurred while fetching commands.',
			ephemeral: true
		})
	}
}

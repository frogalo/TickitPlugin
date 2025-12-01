import { createCommandConfig, logger, Flashcore } from 'robo.js'
import { EmbedBuilder } from 'discord.js'

export const config = createCommandConfig({
	description: 'View current Tickit configuration'
})

export default async (interaction) => {
	try {
		const guild = interaction.guild
		const member = interaction.member
		
		// Check for Ticket Manager Role
		const ticketManagerRoleId = await Flashcore.get('ticket-manager-role', { namespace: guild.id })
		if (!ticketManagerRoleId || !member.roles.cache.has(ticketManagerRoleId)) {
			return interaction.reply({
				content: '❌ **You do not have permission to use this command.**',
				ephemeral: true
			})
		}
		
		// Fetch configuration from Flashcore
		const configChannelId = await Flashcore.get('config-channel', { namespace: guild.id })
		const ticketChannelId = await Flashcore.get('ticket-channel', { namespace: guild.id })

		const embed = new EmbedBuilder()
			.setColor('5865F2')
			.setTitle('⚙️ Tickit Configuration')
			.setDescription('Current settings for the Tickit plugin. To change these, please go to the configuration channel.')
			.addFields(
				{ 
					name: '👥 Ticket Manager Role', 
					value: ticketManagerRoleId ? `<@&${ticketManagerRoleId}>` : '❌ Not Set', 
					inline: true 
				},
				{ 
					name: '⚙️ Config Channel', 
					value: configChannelId ? `<#${configChannelId}>` : '❌ Not Set', 
					inline: true 
				},
				{ 
					name: '🎫 Ticket Channel', 
					value: ticketChannelId ? `<#${ticketChannelId}>` : '❌ Not Set', 
					inline: true 
				}
			)
			.setFooter({ text: 'Powered by Tickit' })
			.setTimestamp()

		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		})
	} catch (error) {
		logger.error('Error fetching configuration:', error)
		await interaction.reply({
			content: '❌ An error occurred while fetching configuration.',
			ephemeral: true
		})
	}
}

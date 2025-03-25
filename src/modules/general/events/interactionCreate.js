import { logger } from 'robo.js'
import { ActionRowBuilder, RoleSelectMenuBuilder } from 'discord.js'
import {
	step1CreateConfigModeSelectMenu,
	step2CreateRoleSelectMenu,
	step3CreateChannelOptionsMenu,
	step3CreateChannelInstructionEmbed,
	step0HandleStartConfiguration,
	step2CreateRoleInstructionEmbed
} from '../../../config/initialSetup.js'

/**
 * Handles interactions for the configuration process.
 * @param {Object} interaction - The Discord interaction object.
 */
export default async (interaction) => {
	const { customId } = interaction

	switch (customId) {
		// Step 0: Handle "Start Configuration" button
		case 'start-configuration':
			await step0HandleStartConfiguration(interaction)
			break


		// Step 1: Handle configuration mode selection
		case 'configuration-mode': {
			const values = interaction.values
			//todo: implement with backend
			if (values.includes('use-online-dashboard')) {
				await interaction.reply({
					content: 'The online dashboard functionality is coming soon. Please choose "Run Locally" for now.',
					ephemeral: true
				})

				// Automatically reset the select menu back to "Run Locally"
				const updatedSelectMenu = step1CreateConfigModeSelectMenu()
				const updatedSelectMenuRow = new ActionRowBuilder().addComponents(updatedSelectMenu)

				await interaction.message.edit({
					components: [updatedSelectMenuRow]
				})
			} else if (values.includes('run-locally')) {
				// Proceed with "Run Locally" selection
				const updatedSelectMenu = step1CreateConfigModeSelectMenu()
				updatedSelectMenu.setOptions([
					{
						label: 'Run Locally',
						description: 'Keep everything local to your Discord server.',
						value: 'run-locally',
						emoji: '💻',
						default: true
					},
					{
						label: 'Use Online Dashboard',
						description: 'Manage tickets via the online dashboard (coming soon).',
						value: 'use-online-dashboard',
						emoji: '🌐'
					}
				]) // Update the placeholder
				const updatedSelectMenuRow = new ActionRowBuilder().addComponents(updatedSelectMenu)

				// Update the message with the updated select menu
				await interaction.update({
					content: null,
					components: [updatedSelectMenuRow]
				})

				// Check if Step 2 already exists
				const messages = await interaction.channel.messages.fetch({ limit: 10 })
				const step2Exists = messages.some((message) =>
					message.embeds.some(
						(embed) =>
							embed.title === 'Step 2: Role Selection' || (embed.data && embed.data.title === 'Step 2: Role Selection')
					)
				)

				// If Step 2 doesn't exist, create it
				if (!step2Exists) {
					const step2InstructionEmbed = step2CreateRoleInstructionEmbed()
					const roleSelectMenu = step2CreateRoleSelectMenu()
					const roleSelectMenuRow = new ActionRowBuilder().addComponents(roleSelectMenu)

					await interaction.channel.send({
						embeds: [step2InstructionEmbed],
						components: [roleSelectMenuRow]
					})

					logger.info(`Created Step 2: Role Selection in guild: ${interaction.guild.name}`)
				} else {
					logger.info(`Step 2 already exists, skipping creation in guild: ${interaction.guild.name}`)
				}
			}

			logger.info(`Configuration mode updated: ${values.join(', ')}`)
			break
		}

		// Step 2: Handle role selection
		case 'role-selection':
			{
				const selectedRole = interaction.values[0]
				const role = interaction.guild.roles.cache.get(selectedRole)
				const roleName = role ? role.name : 'Unknown Role'

				// Create role display menu
				const roleDisplayMenu = new RoleSelectMenuBuilder()
					.setCustomId('role-selection')
					.setPlaceholder(`Selected Role: ${roleName}`)
				const roleDisplayRow = new ActionRowBuilder().addComponents(roleDisplayMenu)

				// Update the current message
				await interaction.update({
					content: null,
					components: [roleDisplayRow]
				})


				try {
					const messages = await interaction.channel.messages.fetch({ limit: 10 })
					const step3Exists = messages.some((message) =>
						message.embeds.some(
							(embed) =>
								embed.title === 'Step 3: Channel Setup' || (embed.data && embed.data.title === 'Step 3: Channel Setup')
						)
					)

					if (!step3Exists) {
						const step3InstructionEmbed = step3CreateChannelInstructionEmbed()
						const channelOptions = step3CreateChannelOptionsMenu()
						const channelOptionsRow = new ActionRowBuilder().addComponents(channelOptions)

						await interaction.channel.send({
							embeds: [step3InstructionEmbed],
							components: [channelOptionsRow]
						})

						logger.info(`Created Step 3 for role ${roleName} in guild: ${interaction.guild.name}`)
					} else {
						logger.info(`Step 3 already exists, skipping creation in guild: ${interaction.guild.name}`)
					}
				} catch (error) {
					logger.error('Error checking or sending Step 3 message:', error)
				}
			}

			logger.info(`Admin selected role ${roleName} (${selectedRole}) in guild: ${interaction.guild.name}`)
			break

		// Step 3: Handle channel selection
		case 'channel-selection': {
			await step3HandleChannelSelection(interaction)
			break
		}

		// Step 3: Handle existing channel selection
		case 'existing-channel-selection': {
			await step3HandleExistingChannelSelection(interaction)
			break
		}


		// Step 1: Handle configuration mode change
		case 'change-configuration-mode': {
			const configModeMenu = step1CreateConfigModeSelectMenu()
			const configModeMenuRow = new ActionRowBuilder().addComponents(configModeMenu)

			// Preserve the current embed
			const currentEmbed = interaction.message.embeds[0]

			await interaction.update({
				content: null,
				embeds: [currentEmbed],
				components: [configModeMenuRow]
			})

			logger.info(`Admin chose to change the configuration mode in guild: ${interaction.guild.name}`)
			break
		}

		// Default case for unknown customId
		default:
			logger.warn(`Unknown customId: ${customId} in guild: ${interaction.guild?.name || 'Unknown'}`)
			await interaction.reply({
				content: 'An unknown action was triggered. Please try again or contact support.',
				ephemeral: true
			})
			break
	}
}

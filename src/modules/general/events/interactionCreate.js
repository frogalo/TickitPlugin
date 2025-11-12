import { step0 } from '../../../config/steps/step0.js'
import { step1 } from '../../../config/steps/step1.js'
import { step2 } from '../../../config/steps/step2.js'
import { step3 } from '../../../config/steps/step3.js'
import { step4 } from '../../../config/steps/step4.js'
import { logger } from 'robo.js'

export default async (interaction) => {
	try {
		if (interaction.isButton()) {
			await handleButtonInteraction(interaction)
		} else if (interaction.isStringSelectMenu()) {
			await handleSelectMenuInteraction(interaction)
		} else if (interaction.isRoleSelectMenu()) {
			await handleRoleSelectMenuInteraction(interaction)
		} else if (interaction.isModalSubmit()) {
			await handleModalSubmit(interaction)
		}
	} catch (error) {
		logger.error('Error in interactionCreate:', error)
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: '❌ An unknown action was triggered. Please try again or contact support.',
				ephemeral: true
			})
		}
	}
}

async function handleButtonInteraction(interaction) {
	const { customId } = interaction

	// Handle setup-ticket-panel with embedded channel ID
	if (customId.startsWith('setup-ticket-panel:')) {
		const channelId = customId.split(':')[1]

		try {
			// Fetch channel directly instead of using storage
			const targetChannel = await interaction.guild.channels.fetch(channelId)

			if (!targetChannel) {
				await interaction.reply({
					content: '❌ The ticket channel was not found. It may have been deleted.',
					ephemeral: true
				})
				return
			}

			logger.info(`Setup button clicked for channel: #${targetChannel.name} (${channelId})`)

			// Call step4 with setup action to create the actual panel
			await step4(interaction.channel, 'setup', targetChannel)

			// Defer the update since step4 handles the responses
			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferUpdate()
			}
		} catch (error) {
			logger.error(`Error fetching channel ${channelId}:`, error)
			await interaction.reply({
				content: '❌ Failed to access the ticket channel. Please try again.',
				ephemeral: true
			})
		}
		return
	}

	// Handle edit ticket panel button
	if (customId === 'edit-ticket-panel') {
		await step4(interaction, 'edit')
		return
	}

	// Handle other button interactions
	switch (customId) {
		case 'start-configuration':
			await step0(interaction, 'handle-start')
			break

		default:
			logger.warn(`Unknown button interaction: ${customId}`)
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: '❌ Unknown button. Please try again.',
					ephemeral: true
				})
			}
	}
}

async function handleSelectMenuInteraction(interaction) {
	const { customId, values } = interaction

	try {
		switch (customId) {
			case 'configuration-mode':
				await step1(interaction, 'handle-selection', values)
				break

			case 'channel-selection':
				if (values[0] === 'new-channel') {
					await step3(interaction, 'create-new')
				} else if (values[0] === 'existing-channel') {
					await step3(interaction, 'use-existing')
				}
				break

			case 'existing-channel-selection':
				await step3(interaction, 'existing-channel-selection')
				break

			default:
				logger.warn(`Unknown select menu interaction: ${customId}`)
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: '❌ Unknown menu. Please try again.',
						ephemeral: true
					})
				}
		}
	} catch (error) {
		logger.error(`Error handling select menu ${customId}:`, error)
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: '❌ An error occurred while processing your selection. Please try again.',
				ephemeral: true
			})
		}
	}
}

async function handleRoleSelectMenuInteraction(interaction) {
	const { customId } = interaction

	try {
		switch (customId) {
			case 'role-selection':
				await step2(interaction, 'handle-selection')
				break

			default:
				logger.warn(`Unknown role select menu interaction: ${customId}`)
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: '❌ Unknown role menu. Please try again.',
						ephemeral: true
					})
				}
		}
	} catch (error) {
		logger.error(`Error handling role select menu ${customId}:`, error)
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: '❌ An error occurred while processing your selection. Please try again.',
				ephemeral: true
			})
		}
	}
}

async function handleModalSubmit(interaction) {
	const { customId } = interaction

	try {
		switch (customId) {
			case 'edit-ticket-panel-modal':
				await step4(interaction, 'modal-submit')
				break

			default:
				logger.warn(`Unknown modal submission: ${customId}`)
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: '❌ Unknown form. Please try again.',
						ephemeral: true
					})
				}
		}
	} catch (error) {
		logger.error(`Error handling modal ${customId}:`, error)
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: '❌ An error occurred while submitting the form. Please try again.',
				ephemeral: true
			})
		}
	}
}

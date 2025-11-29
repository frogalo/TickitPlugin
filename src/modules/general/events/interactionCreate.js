import { step0 } from '../../../config/steps/step0.js'
import { step1 } from '../../../config/steps/step1.js'
import { step2 } from '../../../config/steps/step2.js'
import { step3 } from '../../../config/steps/step3.js'
import { step4 } from '../../../config/steps/step4.js'
import { logger, Flashcore } from 'robo.js'
import { INTERACTION_IDS, CHANNEL_SELECTION_VALUES } from '../../../config/constants.js'

/**
 * Main interaction handler for the bot
 * Routes different interaction types to their respective handlers
 */
export default async (interaction) => {
	try {
		if (interaction.isButton()) {
			await handleButtonInteraction(interaction)
		} else if (interaction.isStringSelectMenu()) {
			await handleStringSelectMenuInteraction(interaction)
		} else if (interaction.isRoleSelectMenu()) {
			await handleRoleSelectMenuInteraction(interaction)
		} else if (interaction.isModalSubmit()) {
			await handleModalSubmit(interaction)
		}
	} catch (error) {
		logger.error('Error in interactionCreate:', error)
		await handleInteractionError(interaction, 'An unknown action was triggered')
	}
}

/**
 * Button interaction handlers
 */
const buttonHandlers = {
	[INTERACTION_IDS.START_CONFIGURATION]: {
		callback: async (interaction) => {
			return step0(interaction, 'handle-start')
		}
	},
	[INTERACTION_IDS.SETUP_TICKET_PANEL]: {
		callback: async (interaction) => {
			await step4(interaction, 'setup')

			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferUpdate()
			}
		}
	},
	[INTERACTION_IDS.EDIT_TICKET_PANEL]: {
		callback: async (interaction) => {
			await step4(interaction, 'edit')
		}
	},
	[INTERACTION_IDS.CREATE_TICKET]: {
		callback: async (interaction) => {
			// TODO: Implement ticket creation logic
			return interaction.reply({
				content: '✅ Ticket creation would be handled here.',
				ephemeral: true
			})
		}
	}
}

function split_id(id) {
	if (id.includes(':')) {
		return id.split(':')
	} else {
		return [id]
	}
}

/**
 * Handles all button interactions using Object-based routing
 */
async function handleButtonInteraction(interaction) {
	const { customId } = interaction
	const prefix = split_id(customId)[0]

	if (buttonHandlers[prefix]) {
		await buttonHandlers[prefix].callback(interaction)
	} else {
		logger.warn(`Unknown button interaction: ${customId}`)
		return interaction.reply({
			content: '❌ Unknown button. Please try again.',
			ephemeral: true
		})
	}
}

/**
 * String select menu handlers map
 */
const selectMenuHandlers = new Map([
	[INTERACTION_IDS.CONFIGURATION_MODE, handleConfigurationMode],
	[INTERACTION_IDS.CHANNEL_SELECTION, handleChannelSelection],
	[INTERACTION_IDS.EXISTING_CHANNEL_SELECTION, handleExistingChannelSelection]
])

/**
 * Handles all string select menu interactions using Map-based routing
 */
async function handleStringSelectMenuInteraction(interaction) {
	const { customId } = interaction

	if (selectMenuHandlers.has(customId)) {
		return await selectMenuHandlers.get(customId)(interaction)
	}

	logger.warn(`Unknown select menu interaction: ${customId}`)
	return interaction.reply({
		content: '❌ Unknown menu. Please try again.',
		ephemeral: true
	})
}

/**
 * Handle configuration mode selection
 */
async function handleConfigurationMode(interaction) {
	return step1(interaction, 'handle-selection', interaction.values)
}

/**
 * Handle channel selection
 */
async function handleChannelSelection(interaction) {
	const [value] = interaction.values
	
	if (value === CHANNEL_SELECTION_VALUES.NEW_CHANNEL) {
		return step3(interaction, 'create-new')
	} else if (value === CHANNEL_SELECTION_VALUES.EXISTING_CHANNEL) {
		return step3(interaction, 'use-existing')
	}
}

/**
 * Handle existing channel selection
 */
async function handleExistingChannelSelection(interaction) {
	return step3(interaction, 'existing-channel-selection')
}

/**
 * Role select menu handlers map
 */
const roleSelectHandlers = new Map([
	[INTERACTION_IDS.ROLE_SELECTION, handleRoleSelection]
])

/**
 * Handles all role select menu interactions using Map-based routing
 */
async function handleRoleSelectMenuInteraction(interaction) {
	const { customId } = interaction

	if (roleSelectHandlers.has(customId)) {
		return await roleSelectHandlers.get(customId)(interaction)
	}

	logger.warn(`Unknown role select menu interaction: ${customId}`)
	return interaction.reply({
		content: '❌ Unknown role menu. Please try again.',
		ephemeral: true
	})
}

/**
 * Handle role selection
 */
async function handleRoleSelection(interaction) {
	return step2(interaction, 'handle-selection')
}

/**
 * Modal submit handlers map
 */
const modalHandlers = new Map([
	['edit-ticket-panel-modal', handleEditTicketPanelModal],
	[INTERACTION_IDS.EDIT_TICKET_PANEL_MODAL, handleEditTicketPanelModal]
])

/**
 * Handles all modal submissions using Map-based routing
 */
async function handleModalSubmit(interaction) {
	const { customId } = interaction

	// Check for exact matches first
	if (modalHandlers.has(customId)) {
		return await modalHandlers.get(customId)(interaction)
	}

	// Extract prefix for dynamic modal IDs
	const prefix = customId.includes(':') ? customId.split(':')[0] : customId

	if (modalHandlers.has(prefix)) {
		return await modalHandlers.get(prefix)(interaction)
	}

	logger.warn(`Unknown modal submission: ${customId}`)
	return interaction.reply({
		content: '❌ Unknown form. Please try again.',
		ephemeral: true
	})
}

/**
 * Handle edit ticket panel modal submission
 */
async function handleEditTicketPanelModal(interaction) {
	return step4(interaction, 'modal-submit')
}

/**
 * Centralized error handler for interactions
 * Ensures user gets feedback even if interaction was already replied to
 */
async function handleInteractionError(interaction, message) {
	try {
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: `❌ **${message}. Please try again.**`,
				ephemeral: true
			})
		} else if (!interaction.replied) {
			await interaction.followUp({
				content: `❌ **${message}. Please try again.**`,
				ephemeral: true
			})
		}
	} catch (followUpError) {
		logger.error('Failed to send error message to user:', followUpError)
	}
}
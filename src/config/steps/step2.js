import { EmbedBuilder, RoleSelectMenuBuilder, ActionRowBuilder } from 'discord.js'
import { logger } from 'robo.js'
import { step3 } from './step3.js'

export async function step2(channelOrInteraction, action) {
    try {
        switch (action) {
            case 'initialize':
                await sendRoleSelection(channelOrInteraction)
                break

            case 'handle-selection':
                await handleRoleSelection(channelOrInteraction)
                break

            default:
                logger.error(`Unknown action for step2: ${action}`)
        }
    } catch (error) {
        logger.error(`Error in step2 (${action}):`, error)
    }
}

async function sendRoleSelection(channel) {
    const roleEmbed = new EmbedBuilder()
        .setColor('c1daa1')
        .setTitle('Step 2: Role Selection')
        .setDescription(
            '👥 **Select the role that will manage tickets for your server.**\n\n' +
            'This role will have access to view and manage all tickets created by users. ' +
            'Make sure to select a role that is trusted and has the appropriate permissions. ' +
            'You can change this role later if needed by reconfiguring the bot settings.\n\n' +
            'Choose a role from the dropdown below.'
        )
        .setFooter({ text: '🔄 You can change this later if needed.' })

    const roleMenu = new RoleSelectMenuBuilder()
        .setCustomId('role-selection')
        .setPlaceholder('Select a Role')

    const roleRow = new ActionRowBuilder().addComponents(roleMenu)

    await channel.send({ embeds: [roleEmbed], components: [roleRow] })
    logger.info('Sent role selection message')
}

async function handleRoleSelection(interaction) {
    const messages = await interaction.channel.messages.fetch({ limit: 10 })
    const step3Exists = messages.some((message) =>
        message.embeds.some((embed) => embed.title === 'Step 3: Channel Setup')
    )

    if (!step3Exists) {
        await step3(interaction.channel, 'initialize')
    } else {
        logger.info(
            `Step 3 already exists, skipping creation in guild: ${interaction.guild.name}`
        )
    }

    await interaction.deferUpdate()
    logger.info(`Role selected in guild: ${interaction.guild.name}`)
}
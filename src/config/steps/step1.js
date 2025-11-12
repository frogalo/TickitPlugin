import {
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder
} from 'discord.js'
import { logger } from 'robo.js'
import { step2 } from './step2.js'

export async function step1(channelOrInteraction, action, values = []) {
    try {
        switch (action) {
            case 'initialize':
                await sendConfigurationModeSelection(channelOrInteraction)
                break

            case 'handle-selection':
                await handleModeSelection(channelOrInteraction, values)
                break

            default:
                logger.error(`Unknown action for step1: ${action}`)
        }
    } catch (error) {
        logger.error(`Error in step1 (${action}):`, error)
    }
}

async function sendConfigurationModeSelection(channel) {
    const configEmbed = new EmbedBuilder()
        .setColor('c1daa1')
        .setTitle('Step 1: Configuration Mode')
        .setDescription(
            `**Please select the mode in which the bot will operate:**\n\n` +
            `💻 **Run Locally**: Keep everything local to your Discord server.\n` +
            `🌐 **Use Online Dashboard** *(Coming Soon)*: Manage tickets via an online dashboard.\n\n` +
            `Choose an option below to proceed.`
        )
        .setFooter({ text: '🔄 You can change this later if needed.' })

    const configMenu = new StringSelectMenuBuilder()
        .setCustomId('configuration-mode')
        .setPlaceholder('Select Configuration Mode')
        .addOptions([
            {
                label: 'Run Locally',
                description: 'Keep everything local to your Discord server.',
                value: 'run-locally',
                emoji: '💻'
            },
            {
                label: 'Use Online Dashboard',
                description: 'Manage tickets via the online dashboard (coming soon).',
                value: 'use-online-dashboard',
                emoji: '🌐'
            }
        ])

    const configRow = new ActionRowBuilder().addComponents(configMenu)

    await channel.send({ embeds: [configEmbed], components: [configRow] })
    logger.info('Sent configuration mode selection message')
}

async function handleModeSelection(interaction, values) {
    if (values.includes('use-online-dashboard')) {
        await interaction.reply({
            content:
                'The online dashboard functionality is coming soon. Please choose "Run Locally" for now.',
            ephemeral: true
        })

        const resetMenu = new StringSelectMenuBuilder()
            .setCustomId('configuration-mode')
            .setPlaceholder('Select Configuration Mode')
            .addOptions([
                {
                    label: 'Run Locally',
                    description: 'Keep everything local to your Discord server.',
                    value: 'run-locally',
                    emoji: '💻'
                },
                {
                    label: 'Use Online Dashboard',
                    description: 'Manage tickets via the online dashboard (coming soon).',
                    value: 'use-online-dashboard',
                    emoji: '🌐'
                }
            ])

        const resetRow = new ActionRowBuilder().addComponents(resetMenu)
        await interaction.message.edit({ components: [resetRow] })
        return
    }

    if (values.includes('run-locally')) {
        const updatedMenu = new StringSelectMenuBuilder()
            .setCustomId('configuration-mode')
            .setPlaceholder('Select Configuration Mode')
            .addOptions([
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
            ])

        const updatedRow = new ActionRowBuilder().addComponents(updatedMenu)
        await interaction.update({ components: [updatedRow] })

        const messages = await interaction.channel.messages.fetch({ limit: 10 })
        const step2Exists = messages.some((message) =>
            message.embeds.some(
                (embed) => embed.title === 'Step 2: Role Selection'
            )
        )

        if (!step2Exists) {
            await step2(interaction.channel, 'initialize')
        } else {
            logger.info(
                `Step 2 already exists, skipping creation in guild: ${interaction.guild.name}`
            )
        }
    }

    logger.info(`Configuration mode updated: ${values.join(', ')}`)
}
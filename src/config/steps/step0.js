import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js'
import { logger } from 'robo.js'
import { step1 } from './step1.js'

export async function step0(channelOrInteraction, action) {
    try {
        switch (action) {
            case 'initialize':
                await sendWelcomeMessage(channelOrInteraction)
                break

            case 'handle-start':
                await handleStartConfiguration(channelOrInteraction)
                break

            default:
                logger.error(`Unknown action for step0: ${action}`)
        }
    } catch (error) {
        logger.error(`Error in step0 (${action}):`, error)
    }
}

async function sendWelcomeMessage(channel) {
    const welcomeEmbed = new EmbedBuilder()
        .setColor('c1daa1')
        .setTitle('Tickit Configuration')
        .setDescription(
            `Welcome to the **Tickit Configuration** process! \n\n` +
            `This setup will guide you through the following steps:\n\n` +
            `1️⃣ **Select Configuration Mode**: Choose how the bot will operate.\n` +
            `2️⃣ **Assign Roles**: Select the role that will manage tickets.\n` +
            `3️⃣ **Set Up Channels**: Choose where tickets will be created.\n` +
            `4️⃣ **Configure Ticket Panel**: Set up the panel users will interact with.`
        )
        .setFooter({ text: 'Click "Start Configuration" to begin.' })

    const startButton = new ButtonBuilder()
        .setCustomId('start-configuration')
        .setLabel('Start Configuration')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🚀')

    const startRow = new ActionRowBuilder().addComponents(startButton)

    await channel.send({ embeds: [welcomeEmbed], components: [startRow] })
    logger.info('Sent welcome message to configuration channel')
}

async function handleStartConfiguration(interaction) {
    const updatedWelcomeEmbed = EmbedBuilder.from(
        interaction.message.embeds[0]
    ).setFooter({ text: null })

    await interaction.message.edit({
        embeds: [updatedWelcomeEmbed],
        components: []
    })

    await step1(interaction.channel, 'initialize')
    await interaction.deferUpdate()
    logger.info(
        `Admin started configuration in guild: ${interaction.guild.name}`
    )
}
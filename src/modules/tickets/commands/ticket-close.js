// src/commands/ticket-close.js
import { createCommandConfig, logger } from "robo.js";

export const config = createCommandConfig({
    description: "Close an active ticket",
});

export default async (interaction) => {
    const { channel } = interaction;

    // Verify if this is a ticket channel
    if (!channel.name.startsWith("ticket-")) {
        return interaction.reply({
            content: "This command can only be used in ticket channels!",
            ephemeral: true,
        });
    }

    try {
        await interaction.reply({
            content: "Closing this ticket in 5 seconds...",
        });

        // Archive or delete the channel after a delay
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (err) {
                logger.error(`Error deleting ticket channel: ${err}`);
            }
        }, 5000);
    } catch (error) {
        logger.error(`Error closing ticket: ${error}`);
        await interaction.reply({
            content: "There was an error closing the ticket.",
            ephemeral: true,
        });
    }
};

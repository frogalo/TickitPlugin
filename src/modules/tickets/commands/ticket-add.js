// src/commands/ticket-add.js
import { createCommandConfig, logger } from "robo.js";
import { PermissionFlagsBits } from "discord.js";

export const config = createCommandConfig({
    description: "Add a user to the current ticket",
    options: [
        {
            name: "user",
            description: "The user to add to this ticket",
            type: "USER",
            required: true,
        },
    ],
});

export default async (interaction) => {
    const { channel } = interaction;
    const targetUser = interaction.options.getUser("user");

    // Verify if this is a ticket channel
    if (!channel.name.startsWith("ticket-")) {
        return interaction.reply({
            content: "This command can only be used in ticket channels!",
            ephemeral: true,
        });
    }

    try {
        // Add the user to the ticket channel
        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
        });

        await interaction.reply({
            content: `${targetUser.toString()} has been added to the ticket.`,
        });
    } catch (error) {
        logger.error(`Error adding user to ticket: ${error}`);
        await interaction.reply({
            content: "There was an error adding the user to this ticket.",
            ephemeral: true,
        });
    }
};

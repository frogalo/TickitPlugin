<p align="center">✨ <strong>Generated with <a href="https://robojs.dev/create-robo">create-robo</a> magic!</strong> ✨</p>

# robo-ticket

Welcome to **robo-ticket**! This plugin is designed to seamlessly integrate with your existing **[Robo.js](https://robojs.dev)** project and provide a robust support ticket system. The best part? Everything automatically works once you install this plugin!

- [ **Documentation:** Getting started with Robo.js](https://robojs.dev/discord-activities)
- [ **Discord:** Robo - Imagine Magic](https://robojs.dev/discord)

> 👩‍💻 **Are you the plugin developer?** Check out the **[Development Guide](https://robojs.dev/plugins/create)** for instructions on how to develop, build, and publish this plugin.

## Features

- **Automated Setup**: Automatically creates a configuration channel when joining a server.
- **Interactive Configuration**: Easy-to-use step-by-step setup for roles and channels.
- **Ticket Management**: Users can create tickets with a single click.
- **Role-Based Access**: Restrict admin capabilities to a designated "Ticket Manager" role.
- **Flashcore Integration**: Persistent storage for configuration and ticket data.

## Installation

To add this plugin to your **Robo.js** project:

```bash
npx robo add robo-ticket
```

New to **Robo.js**? Start your project with this plugin pre-installed:

```bash
npx create-robo <project-name> -p robo-ticket
```

## Setup

1.  **Invite the Bot**: Add your Robo to your Discord server.
2.  **Auto-Configuration**: Upon joining, the bot will automatically create a private configuration channel (e.g., `#ticket-config`).
3.  **Follow the Steps**: Go to the configuration channel and follow the interactive prompts to:
    - Set the **Ticket Manager Role**.
    - Set the **Ticket Channel** (where users will open tickets).
    - Create the **Ticket Panel**.

## Usage

### For Users

- **Open a Ticket**: Navigate to the designated ticket channel and click the **"Create Ticket"** button. A new private channel will be created for you and the support team.
- **Close a Ticket**: Use the `/ticket-close` command or click the **"Close Ticket"** button within the ticket channel.

### For Admins (Ticket Managers)

- **Manage Configuration**: Use the configuration channel to update settings at any time.
- **View Config**: Use `/tickitconfig` to see the current setup.
- **List Commands**: Use `/commands` to see all available administrative commands.

## Commands

| Command         | Description                                        | Permission           |
| :-------------- | :------------------------------------------------- | :------------------- |
| `/help`         | Displays help information about the ticket system. | Everyone             |
| `/ticket-close` | Closes the current ticket channel.                 | Everyone (in ticket) |
| `/tickitconfig` | Displays current configuration settings.           | Ticket Manager       |
| `/commands`     | Lists all available commands.                      | Ticket Manager       |

## Required Intents

```ts
intents: ['Guilds', 'GuildMessages', 'MessageContent']
```

Add these to your `robo.mjs` configuration file.

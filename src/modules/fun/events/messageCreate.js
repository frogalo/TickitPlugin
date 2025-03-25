import { logger } from 'robo.js';

export default (message) => {
    if (message.content.toLowerCase() === 'ping') {
        message.reply('Pong! 🏓');
        logger.info(`Replied to "ping" in ${message.guild.name}`);
    }
};

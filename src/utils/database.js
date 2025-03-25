// src/utils/database.js
import mongoose from 'mongoose';
import { logger } from 'robo.js';

let isConnected = false;

export const connectToDatabase = async (uri) => {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(uri);
        isConnected = true;
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        throw error;
    }
};

export const isDatabaseConfigured = (config) => {
    return config && config.mongoUri && config.mongoUri.startsWith('mongodb');
};

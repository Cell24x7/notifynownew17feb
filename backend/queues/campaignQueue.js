const { Queue } = require('bullmq');

// Redis Connection setup for High-Volume Engine
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Critical for BullMQ
  connectTimeout: 5000, // Wait 5s max for Redis
};

// Create the High-Volume Campaign Queue with Environment Isolation
const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
const queueName = `campaign-sending-${envSuffix}`;

const campaignQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Auto-retry 3 times if API fails
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s before first retry
    },
    removeOnComplete: {
      age: 3600, // Keep last 1 hour of history
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failures for 24 hours debugging
    }
  }
});

campaignQueue.on('error', (err) => {
  if (process.env.NODE_ENV !== 'production' || (process.cwd().includes('C:') || process.cwd().includes('Users'))) {
    // Silence local Redis errors so app doesn't crash on Windows
    console.log('🔇 Local Redis not found, continuing without high-volume queue...');
  } else {
    console.error('❌ Redis Queue Error:', err.message);
  }
});

module.exports = { campaignQueue, redisConnection };

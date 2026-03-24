const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

// Connect to local Redis server (Default port 6379)
// For 1Cr+ traffic, Redis should ideally be on its own optimized server
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Critical for BullMQ
});

// Create the High-Volume Campaign Queue
const campaignQueue = new Queue('campaign-sending', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Auto-retry 3 times if API fails
    backoff: {
      type: 'exponential',
      delay: 1000, // Wait 1s, then 2s, then 4s...
    },
    removeOnComplete: true, // Keep Redis memory clean!
    removeOnFail: 1000,      // Keep last 1000 failed for debugging
  }
});

module.exports = { campaignQueue, redisConnection };

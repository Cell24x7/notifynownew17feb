const { Queue } = require('bullmq');

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
};

const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
const queueName = `csv-parser-${envSuffix}`;

const csvParserQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep history for 1 day
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600 * 7, // Keep failures for 7 days
    }
  }
});

csvParserQueue.on('error', (err) => {
  console.error('❌ CSV Parser Queue Error:', err.message);
});

module.exports = { csvParserQueue, redisConnection };

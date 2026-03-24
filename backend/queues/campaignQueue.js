// Mock version to bypass Redis dependency
const redisConnection = null;
const Queue = class { 
    constructor() {}
    addBulk() { return Promise.resolve(); }
    pause() { return Promise.resolve(); }
    resume() { return Promise.resolve(); }
    getJobCountByTypes() { return Promise.resolve(0); }
    getJobs() { return Promise.resolve([]); }
};

const queueName = 'mock-queue';
const campaignQueue = new Queue();

module.exports = { campaignQueue, redisConnection };

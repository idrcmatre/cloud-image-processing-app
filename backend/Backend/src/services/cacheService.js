const Memcached = require("memcached");
const util = require("node:util");
const { loadConfig } = require('../../config');
const { encodeFileName, decodeFileName } = require('../utils/fileNameUtils');

class CacheService {
    constructor() {
        this.memcached = null;
        this.isLocal = process.env.NODE_ENV === 'development';
    }

    async initialize() {
        const config = await loadConfig();
        const memcachedAddress = config.ELASTICACHE_ENDPOINT;
        this.memcached = new Memcached(memcachedAddress);
        this.memcached.on("failure", (details) => {
            console.log("Memcached server failure: ", details);
        });
        // Monkey patch some functions for convenience
        this.memcached.aGet = util.promisify(this.memcached.get);
        this.memcached.aSet = util.promisify(this.memcached.set);
        console.log("Memcached client initialized with endpoint:", memcachedAddress);
    }

    async get(key) {
        if (!this.memcached) {
            await this.initialize();
        }
        const encodedKey = encodeFileName(key);
        const value = await this.memcached.aGet(encodedKey);
        if (value) {
            console.log(`Cache hit for key: ${key}`);
        } else {
            console.log(`Cache miss for key: ${key}`);
        }
        return value;
    }

    async set(key, value, ttl = 600) { // Default TTL of 10 minutes
        if (!this.memcached) {
            await this.initialize();
        }
        const encodedKey = encodeFileName(key);
        await this.memcached.aSet(encodedKey, value, ttl);
        console.log(`Set cache for key: ${key} with TTL: ${ttl} seconds`);
    }

    async cachedFetch(key, fetchFunction, ttl = 600) {
        if (!this.memcached) {
            await this.initialize();
        }
        const encodedKey = encodeFileName(key);
        const cachedValue = await this.get(encodedKey);
        if (cachedValue) {
            return cachedValue;
        }
        console.log(`Cache miss for key: ${key}, fetching data`);
        const fetchedValue = await fetchFunction();
        await this.set(encodedKey, fetchedValue, ttl);
        return fetchedValue;
    }

    async setProgress(userId, progressData, ttl = 3600) { // 1 hour TTL for progress
        if (!this.memcached) {
            await this.initialize();
        }
        const key = `progress:${userId}`;
        await this.set(key, JSON.stringify(progressData), ttl);
        console.log(`Set progress for user: ${userId}`);
    }

    async getProgress(userId) {
        if (!this.memcached) {
            await this.initialize();
        }
        const key = `progress:${userId}`;
        const progressData = await this.get(key);
        return progressData ? JSON.parse(progressData) : null;
    }
}



module.exports = new CacheService();
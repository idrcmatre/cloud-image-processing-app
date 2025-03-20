const Memcached = require("memcached");
const util = require("node:util");

class CachingService {
    constructor() {
        this.memcachedAddress = "n11484209-assignment2.km2jzi.cfg.apse2.cache.amazonaws.com:11211";
        this.memcached = new Memcached(this.memcachedAddress);
        this.memcached.on("failure", (details) => {
            console.log("Memcached server failure: ", details);
        });

        // Monkey patch functions for async usage
        this.memcached.aGet = util.promisify(this.memcached.get);
        this.memcached.aSet = util.promisify(this.memcached.set);
    }

    async get(key) {
        try {
            const value = await this.memcached.aGet(key);
            console.log(`Cache ${value ? 'hit' : 'miss'} for key: ${key}`);
            return value;
        } catch (error) {
            console.error("Cache get error:", error);
            return null;
        }
    }

    async set(key, value, ttl = 300) { // Default TTL: 5 minutes
        try {
            await this.memcached.aSet(key, JSON.stringify(value), ttl);
            console.log(`Cached value for key: ${key}`);
        } catch (error) {
            console.error("Cache set error:", error);
        }
    }
}

module.exports = new CachingService();
const { Pool } = require('pg');

const pool = new Pool({
    user: 'image_app',
    host: '172.31.7.4',
    database: 'image_processing',
    password: 'vai',
    port: 5432,
});

async function storeAvgProcessingTime(processType, newTime) {
    const query = `
        INSERT INTO avg_processing_times (process_type, avg_time, count)
        VALUES ($1, $2, 1)
        ON CONFLICT (process_type) DO UPDATE
        SET avg_time = (avg_processing_times.avg_time * avg_processing_times.count + $2) / (avg_processing_times.count + 1),
            count = avg_processing_times.count + 1,
            last_updated = CURRENT_TIMESTAMP
    `;

    try {
        await pool.query(query, [processType, newTime]);
        console.log(`Updated average processing time for ${processType}`);
    } catch (error) {
        console.error('Error updating average processing time:', error);
        throw error;
    }
}

async function getAvgProcessingTimes() {
    const query = 'SELECT process_type, avg_time, count, last_updated FROM avg_processing_times';

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error fetching average processing times:', error);
        throw error;
    }
}

module.exports = {
    storeAvgProcessingTime,
    getAvgProcessingTimes
};
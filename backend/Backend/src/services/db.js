const { Pool } = require('pg');

const pool = new Pool({
  host: '172.31.7.4', // Your database EC2 instance's private IP
  port: 5432,
  database: 'image_processor',
  user: 'vai',
  password: 'vai'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

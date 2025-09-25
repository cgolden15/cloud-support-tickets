require('dotenv').config();
const db = require('../models/database');

console.log('Initializing database...');
console.log('Database will be created at:', process.env.DB_PATH || './database/tickets.db');

// The database initialization happens automatically when the database module is loaded
setTimeout(() => {
  console.log('Database initialization complete!');
  process.exit(0);
}, 1000);
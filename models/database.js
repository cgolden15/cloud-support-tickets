const sqlite3 = require('sqlite3').verbose();
const mssql = require('mssql');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbType = process.env.DB_TYPE || 'sqlite';
    this.init();
  }

  async init() {
    try {
      switch (this.dbType.toLowerCase()) {
        case 'mssql':
        case 'azure-sql':
          await this.initMSSQL();
          break;
        case 'postgresql':
        case 'postgres':
          await this.initPostgreSQL();
          break;
        case 'sqlite':
        default:
          await this.initSQLite();
          break;
      }
      
      await this.createTables();
      await this.createDefaultAdmin();
    } catch (err) {
      console.error('Database initialization error:', err);
      // Fallback to SQLite if other databases fail
      if (this.dbType !== 'sqlite') {
        console.log('Falling back to SQLite...');
        this.dbType = 'sqlite';
        await this.initSQLite();
        await this.createTables();
        await this.createDefaultAdmin();
      }
    }
  }

  async initSQLite() {
    const dbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(process.env.DB_PATH || './database/tickets.db');
    this.dbType = 'sqlite';
    console.log('Connected to SQLite database');
  }

  async initMSSQL() {
    const config = {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 1433,
      options: {
        encrypt: true, // Required for Azure SQL
        enableArithAbort: true,
        trustServerCertificate: false
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    this.pool = await mssql.connect(config);
    this.dbType = 'mssql';
    console.log('Connected to Azure SQL Database');
  }

  async initPostgreSQL() {
    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);
    this.dbType = 'postgresql';
    console.log('Connected to PostgreSQL database');
  }

  async createTables() {
    const queries = this.getCreateTableQueries();
    
    for (const query of queries) {
      try {
        await this.run(query);
      } catch (err) {
        console.error('Error creating table:', err);
      }
    }
  }

  getCreateTableQueries() {
    if (this.dbType === 'mssql') {
      return [
        `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
         CREATE TABLE users (
           id INT IDENTITY(1,1) PRIMARY KEY,
           username NVARCHAR(255) UNIQUE NOT NULL,
           email NVARCHAR(255) UNIQUE NOT NULL,
           password NVARCHAR(255) NOT NULL,
           role NVARCHAR(50) NOT NULL DEFAULT 'staff',
           first_name NVARCHAR(255) NOT NULL,
           last_name NVARCHAR(255) NOT NULL,
           active BIT DEFAULT 1,
           failed_login_attempts INT DEFAULT 0,
           locked_until DATETIME2 NULL,
           created_at DATETIME2 DEFAULT GETDATE(),
           updated_at DATETIME2 DEFAULT GETDATE()
         )`,
        
        `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tickets' AND xtype='U')
         CREATE TABLE tickets (
           id INT IDENTITY(1,1) PRIMARY KEY,
           title NVARCHAR(500) NOT NULL,
           description NVARCHAR(MAX) NOT NULL,
           submitter_name NVARCHAR(255) NOT NULL,
           submitter_email NVARCHAR(255) NOT NULL,
           priority NVARCHAR(50) NOT NULL DEFAULT 'medium',
           category NVARCHAR(100) NOT NULL,
           status NVARCHAR(50) NOT NULL DEFAULT 'open',
           assigned_to INT NULL,
           created_at DATETIME2 DEFAULT GETDATE(),
           updated_at DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (assigned_to) REFERENCES users (id)
         )`,
        
        `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_comments' AND xtype='U')
         CREATE TABLE ticket_comments (
           id INT IDENTITY(1,1) PRIMARY KEY,
           ticket_id INT NOT NULL,
           user_id INT NOT NULL,
           comment NVARCHAR(MAX) NOT NULL,
           created_at DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
           FOREIGN KEY (user_id) REFERENCES users (id)
         )`
      ];
    } else if (this.dbType === 'postgresql') {
      return [
        `CREATE TABLE IF NOT EXISTS users (
           id SERIAL PRIMARY KEY,
           username VARCHAR(255) UNIQUE NOT NULL,
           email VARCHAR(255) UNIQUE NOT NULL,
           password VARCHAR(255) NOT NULL,
           role VARCHAR(50) NOT NULL DEFAULT 'staff',
           first_name VARCHAR(255) NOT NULL,
           last_name VARCHAR(255) NOT NULL,
           active INTEGER DEFAULT 1,
           failed_login_attempts INTEGER DEFAULT 0,
           locked_until TIMESTAMP NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`,
        
        `CREATE TABLE IF NOT EXISTS tickets (
           id SERIAL PRIMARY KEY,
           title VARCHAR(500) NOT NULL,
           description TEXT NOT NULL,
           submitter_name VARCHAR(255) NOT NULL,
           submitter_email VARCHAR(255) NOT NULL,
           priority VARCHAR(50) NOT NULL DEFAULT 'medium',
           category VARCHAR(100) NOT NULL,
           status VARCHAR(50) NOT NULL DEFAULT 'open',
           assigned_to INTEGER NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (assigned_to) REFERENCES users (id)
         )`,
        
        `CREATE TABLE IF NOT EXISTS ticket_comments (
           id SERIAL PRIMARY KEY,
           ticket_id INTEGER NOT NULL,
           user_id INTEGER NOT NULL,
           comment TEXT NOT NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
           FOREIGN KEY (user_id) REFERENCES users (id)
         )`
      ];
    } else {
      // SQLite queries (existing)
      return [
        `CREATE TABLE IF NOT EXISTS users (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           username TEXT UNIQUE NOT NULL,
           email TEXT UNIQUE NOT NULL,
           password TEXT NOT NULL,
           role TEXT NOT NULL DEFAULT 'staff',
           first_name TEXT NOT NULL,
           last_name TEXT NOT NULL,
           active INTEGER DEFAULT 1,
           failed_login_attempts INTEGER DEFAULT 0,
           locked_until DATETIME NULL,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
         )`,
        
        `CREATE TABLE IF NOT EXISTS tickets (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           title TEXT NOT NULL,
           description TEXT NOT NULL,
           submitter_name TEXT NOT NULL,
           submitter_email TEXT NOT NULL,
           priority TEXT NOT NULL DEFAULT 'medium',
           category TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'open',
           assigned_to INTEGER NULL,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (assigned_to) REFERENCES users (id)
         )`,
        
        `CREATE TABLE IF NOT EXISTS ticket_comments (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           ticket_id INTEGER NOT NULL,
           user_id INTEGER NOT NULL,
           comment TEXT NOT NULL,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
           FOREIGN KEY (user_id) REFERENCES users (id)
         )`
      ];
    }
  }

  async createDefaultAdmin() {
    try {
      console.log(`Creating default admin user... Database type: ${this.dbType}`);
      
      // Use database-specific LIMIT syntax
      const query = this.dbType === 'mssql' 
        ? 'SELECT TOP 1 id FROM users WHERE role = ?'
        : 'SELECT id FROM users WHERE role = ? LIMIT 1';
      
      console.log(`Checking if admin exists with query: ${query}`);
      const adminExists = await this.get(query, ['super_admin']);
      console.log('Admin exists check result:', adminExists);
      
      if (!adminExists) {
        console.log('No admin found, creating default admin...');
        const hashedPassword = await bcrypt.hash('admin123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        const insertResult = await this.run(`
          INSERT INTO users (username, email, password, role, first_name, last_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `, ['admin', 'admin@company.com', hashedPassword, 'super_admin', 'System', 'Administrator']);
        
        console.log('Insert result:', insertResult);
        console.log('Default admin user created:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Please change this password after first login!');
      } else {
        console.log('Admin user already exists, skipping creation');
      }
    } catch (err) {
      console.error('Error creating default admin:', err);
      console.error('Error details:', err.message);
    }
  }

  async run(sql, params = []) {
    if (this.dbType === 'mssql') {
      const request = this.pool.request();
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      // Replace ? with @param0, @param1, etc.
      let paramIndex = 0;
      const query = sql.replace(/\?/g, () => `@param${paramIndex++}`);
      
      const result = await request.query(query);
      return { id: result.recordset && result.recordset[0] ? result.recordset[0].id : null, changes: result.rowsAffected[0] };
    } else if (this.dbType === 'postgresql') {
      // Replace ? with $1, $2, etc. for PostgreSQL
      let paramIndex = 1;
      const query = sql.replace(/\?/g, () => `$${paramIndex++}`);
      
      const result = await this.pool.query(query, params);
      return { id: result.rows[0] ? result.rows[0].id : null, changes: result.rowCount };
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.dbType === 'mssql') {
      const request = this.pool.request();
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      let paramIndex = 0;
      const query = sql.replace(/\?/g, () => `@param${paramIndex++}`);
      
      const result = await request.query(query);
      return result.recordset[0] || null;
    } else if (this.dbType === 'postgresql') {
      let paramIndex = 1;
      const query = sql.replace(/\?/g, () => `$${paramIndex++}`);
      
      const result = await this.pool.query(query, params);
      return result.rows[0] || null;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        });
      });
    }
  }

  async all(sql, params = []) {
    if (this.dbType === 'mssql') {
      const request = this.pool.request();
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      let paramIndex = 0;
      const query = sql.replace(/\?/g, () => `@param${paramIndex++}`);
      
      const result = await request.query(query);
      return result.recordset || [];
    } else if (this.dbType === 'postgresql') {
      let paramIndex = 1;
      const query = sql.replace(/\?/g, () => `$${paramIndex++}`);
      
      const result = await this.pool.query(query, params);
      return result.rows || [];
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    }
  }

  async close() {
    if (this.dbType === 'mssql') {
      await this.pool.close();
    } else if (this.dbType === 'postgresql') {
      await this.pool.end();
    } else {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

module.exports = new Database();
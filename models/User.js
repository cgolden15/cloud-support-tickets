const bcrypt = require('bcryptjs');
const db = require('./database');

class User {
  static async create(userData) {
    const { username, email, password, role, firstName, lastName } = userData;
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    return await db.run(`
      INSERT INTO users (username, email, password, role, first_name, last_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, email, hashedPassword, role, firstName, lastName]);
  }

  static async findById(id) {
    return await db.get('SELECT * FROM users WHERE id = ? AND active = 1', [id]);
  }

  static async findByUsername(username) {
    return await db.get('SELECT * FROM users WHERE username = ? AND active = 1', [username]);
  }

  static async findByEmail(email) {
    return await db.get('SELECT * FROM users WHERE email = ? AND active = 1', [email]);
  }

  static async findAll() {
    return await db.all(`
      SELECT id, username, email, role, first_name, last_name, active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
  }

  static async update(id, userData) {
    const { username, email, role, firstName, lastName, active } = userData;
    
    return await db.run(`
      UPDATE users 
      SET username = ?, email = ?, role = ?, first_name = ?, last_name = ?, 
          active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [username, email, role, firstName, lastName, active, id]);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    return await db.run(`
      UPDATE users 
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [hashedPassword, id]);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async incrementFailedLogins(userId) {
    return await db.run(`
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1
      WHERE id = ?
    `, [userId]);
  }

  static async resetFailedLogins(userId) {
    return await db.run(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL
      WHERE id = ?
    `, [userId]);
  }

  static async lockUser(userId, lockoutTime) {
    const lockUntil = new Date(Date.now() + lockoutTime);
    return await db.run(`
      UPDATE users 
      SET locked_until = ?
      WHERE id = ?
    `, [lockUntil.toISOString(), userId]);
  }

  static async isUserLocked(user) {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  }

  static async delete(id) {
    // Soft delete by setting active = 0
    return await db.run(`
      UPDATE users 
      SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);
  }
}

module.exports = User;
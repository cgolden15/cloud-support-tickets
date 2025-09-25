const db = require('./database');

class Ticket {
  static async create(ticketData) {
    const { title, description, submitterName, submitterEmail, priority, category } = ticketData;
    
    return await db.run(`
      INSERT INTO tickets (title, description, submitter_name, submitter_email, priority, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description, submitterName, submitterEmail, priority, category]);
  }

  static async findById(id) {
    return await db.get(`
      SELECT t.*, u.first_name, u.last_name, u.username as assigned_username
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `, [id]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT t.*, u.first_name, u.last_name, u.username as assigned_username
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
    `;
    
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }

    if (filters.assignedTo) {
      conditions.push('t.assigned_to = ?');
      params.push(filters.assignedTo);
    }

    if (filters.priority) {
      conditions.push('t.priority = ?');
      params.push(filters.priority);
    }

    if (filters.category) {
      conditions.push('t.category = ?');
      params.push(filters.category);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.created_at DESC';

    return await db.all(sql, params);
  }

  static async update(id, ticketData) {
    const { title, description, priority, category, status, assignedTo } = ticketData;
    
    return await db.run(`
      UPDATE tickets 
      SET title = ?, description = ?, priority = ?, category = ?, status = ?, 
          assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, priority, category, status, assignedTo, id]);
  }

  static async updateStatus(id, status, assignedTo = null) {
    return await db.run(`
      UPDATE tickets 
      SET status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, assignedTo, id]);
  }

  static async addComment(ticketId, userId, comment) {
    return await db.run(`
      INSERT INTO ticket_comments (ticket_id, user_id, comment)
      VALUES (?, ?, ?)
    `, [ticketId, userId, comment]);
  }

  static async getComments(ticketId) {
    return await db.all(`
      SELECT tc.*, u.first_name, u.last_name, u.username
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = ?
      ORDER BY tc.created_at ASC
    `, [ticketId]);
  }

  static async getStats() {
    const stats = await db.all(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tickets
      GROUP BY status
    `);

    const priorityStats = await db.all(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM tickets
      WHERE status != 'closed'
      GROUP BY priority
    `);

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {}),
      byPriority: priorityStats.reduce((acc, stat) => {
        acc[stat.priority] = stat.count;
        return acc;
      }, {})
    };
  }

  static async delete(id) {
    // Hard delete for tickets
    await db.run('DELETE FROM ticket_comments WHERE ticket_id = ?', [id]);
    return await db.run('DELETE FROM tickets WHERE id = ?', [id]);
  }
}

module.exports = Ticket;
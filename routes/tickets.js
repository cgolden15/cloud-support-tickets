const express = require('express');
const { body, validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { requireStaff, addUserToLocals } = require('../middleware/auth');

const router = express.Router();

// Add user to all ticket routes and require authentication
router.use(addUserToLocals);
router.use(requireStaff);

// Dashboard - ticket overview
router.get('/', async (req, res) => {
  try {
    const stats = await Ticket.getStats();
    const recentTickets = await Ticket.findAll();
    
    res.render('tickets/dashboard', { 
      title: 'IT Dashboard',
      stats: stats,
      recentTickets: recentTickets.slice(0, 10) // Show 10 most recent
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { 
      message: 'Error loading dashboard',
      error: {}
    });
  }
});

// List all tickets with filtering
router.get('/list', async (req, res) => {
  try {
    const filters = {};
    
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.assigned) filters.assignedTo = req.query.assigned;

    const tickets = await Ticket.findAll(filters);
    const users = await User.findAll();
    
    res.render('tickets/list', { 
      title: 'All Tickets',
      tickets: tickets,
      users: users.filter(u => ['admin', 'super_admin', 'staff'].includes(u.role)),
      filters: req.query
    });
  } catch (error) {
    console.error('Ticket list error:', error);
    res.render('error', { 
      message: 'Error loading tickets',
      error: {}
    });
  }
});

// View specific ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).render('error', { 
        message: 'Ticket not found',
        error: {}
      });
    }

    const comments = await Ticket.getComments(req.params.id);
    const users = await User.findAll();
    
    res.render('tickets/view', { 
      title: `Ticket #${ticket.id}`,
      ticket: ticket,
      comments: comments,
      users: users.filter(u => ['admin', 'super_admin', 'staff'].includes(u.role))
    });
  } catch (error) {
    console.error('Ticket view error:', error);
    res.render('error', { 
      message: 'Error loading ticket',
      error: {}
    });
  }
});

// Update ticket
router.post('/:id/update', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  body('status').isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Valid status is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.session.flash = { error: errors.array()[0].msg };
    return res.redirect(`/tickets/${req.params.id}`);
  }

  try {
    const { title, description, priority, category, status, assignedTo } = req.body;
    
    await Ticket.update(req.params.id, {
      title,
      description,
      priority,
      category,
      status,
      assignedTo: assignedTo || null
    });

    req.session.flash = { success: 'Ticket updated successfully' };
    res.redirect(`/tickets/${req.params.id}`);
  } catch (error) {
    console.error('Ticket update error:', error);
    req.session.flash = { error: 'Error updating ticket' };
    res.redirect(`/tickets/${req.params.id}`);
  }
});

// Add comment to ticket
router.post('/:id/comment', [
  body('comment').notEmpty().withMessage('Comment is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.session.flash = { error: errors.array()[0].msg };
    return res.redirect(`/tickets/${req.params.id}`);
  }

  try {
    await Ticket.addComment(req.params.id, req.user.id, req.body.comment);
    req.session.flash = { success: 'Comment added successfully' };
    res.redirect(`/tickets/${req.params.id}`);
  } catch (error) {
    console.error('Comment add error:', error);
    req.session.flash = { error: 'Error adding comment' };
    res.redirect(`/tickets/${req.params.id}`);
  }
});

// Quick status update
router.post('/:id/status', [
  body('status').isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    await Ticket.updateStatus(req.params.id, status, assignedTo || null);
    
    if (req.headers['content-type'] === 'application/json') {
      res.json({ success: true });
    } else {
      req.session.flash = { success: 'Ticket status updated' };
      res.redirect(`/tickets/${req.params.id}`);
    }
  } catch (error) {
    console.error('Status update error:', error);
    if (req.headers['content-type'] === 'application/json') {
      res.status(500).json({ error: 'Error updating status' });
    } else {
      req.session.flash = { error: 'Error updating status' };
      res.redirect(`/tickets/${req.params.id}`);
    }
  }
});

module.exports = router;
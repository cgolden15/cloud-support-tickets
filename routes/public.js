const express = require('express');
const { body, validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');
const { addUserToLocals } = require('../middleware/auth');

const router = express.Router();

// Add user to all public routes
router.use(addUserToLocals);

// Home page
router.get('/', (req, res) => {
  res.render('public/index', { 
    title: 'IT Support - Submit a Ticket'
  });
});

// Submit ticket form
router.get('/submit', (req, res) => {
  res.render('public/submit', { 
    title: 'Submit IT Support Ticket',
    error: null,
    success: null
  });
});

// Submit ticket handler
router.post('/submit', [
  body('submitterName').notEmpty().withMessage('Name is required'),
  body('submitterEmail').isEmail().withMessage('Valid email is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  body('category').notEmpty().withMessage('Category is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('public/submit', { 
      title: 'Submit IT Support Ticket',
      error: errors.array()[0].msg,
      success: null,
      formData: req.body
    });
  }

  try {
    const { submitterName, submitterEmail, title, description, priority, category } = req.body;
    
    const result = await Ticket.create({
      title,
      description,
      submitterName,
      submitterEmail,
      priority,
      category
    });

    res.render('public/submit', { 
      title: 'Submit IT Support Ticket',
      error: null,
      success: `Ticket submitted successfully! Your ticket ID is #${result.id}. Please save this number for reference.`,
      formData: {}
    });
  } catch (error) {
    console.error('Ticket submission error:', error);
    res.render('public/submit', { 
      title: 'Submit IT Support Ticket',
      error: 'An error occurred while submitting your ticket. Please try again.',
      success: null,
      formData: req.body
    });
  }
});

// Ticket status check
router.get('/status', (req, res) => {
  res.render('public/status', { 
    title: 'Check Ticket Status',
    ticket: null,
    error: null
  });
});

router.post('/status', [
  body('ticketId').isInt({ min: 1 }).withMessage('Valid ticket ID is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('public/status', { 
      title: 'Check Ticket Status',
      ticket: null,
      error: errors.array()[0].msg
    });
  }

  try {
    const { ticketId, email } = req.body;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket || ticket.submitter_email.toLowerCase() !== email.toLowerCase()) {
      return res.render('public/status', { 
        title: 'Check Ticket Status',
        ticket: null,
        error: 'Ticket not found or email does not match'
      });
    }

    res.render('public/status', { 
      title: 'Check Ticket Status',
      ticket: ticket,
      error: null
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.render('public/status', { 
      title: 'Check Ticket Status',
      ticket: null,
      error: 'An error occurred while checking ticket status'
    });
  }
});

module.exports = router;
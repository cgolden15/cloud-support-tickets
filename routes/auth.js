const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { addUserToLocals } = require('../middleware/auth');

const router = express.Router();

// Add user to all auth routes
router.use(addUserToLocals);

// Login page
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/tickets');
  }
  
  const redirect = req.query.redirect || '/tickets';
  res.render('auth/login', { 
    error: null, 
    redirect: redirect,
    title: 'Login - IT Ticketing System'
  });
});

// Login handler
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  const redirect = req.body.redirect || '/tickets';
  
  if (!errors.isEmpty()) {
    return res.render('auth/login', { 
      error: errors.array()[0].msg,
      redirect: redirect,
      title: 'Login - IT Ticketing System'
    });
  }

  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);

    if (!user) {
      return res.render('auth/login', { 
        error: 'Invalid username or password',
        redirect: redirect,
        title: 'Login - IT Ticketing System'
      });
    }

    // Check if user is locked
    if (await User.isUserLocked(user)) {
      return res.render('auth/login', { 
        error: 'Account is temporarily locked due to too many failed login attempts',
        redirect: redirect,
        title: 'Login - IT Ticketing System'
      });
    }

    const isValidPassword = await User.verifyPassword(password, user.password);

    if (!isValidPassword) {
      await User.incrementFailedLogins(user.id);
      
      // Lock user after max attempts
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      if (user.failed_login_attempts + 1 >= maxAttempts) {
        const lockoutTime = parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000; // 15 minutes
        await User.lockUser(user.id, lockoutTime);
      }

      return res.render('auth/login', { 
        error: 'Invalid username or password',
        redirect: redirect,
        title: 'Login - IT Ticketing System'
      });
    }

    // Reset failed login attempts on successful login
    await User.resetFailedLogins(user.id);

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    res.redirect(redirect);
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { 
      error: 'An error occurred during login',
      redirect: redirect,
      title: 'Login - IT Ticketing System'
    });
  }
});

// Logout handler
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/tickets');
    }
    res.redirect('/');
  });
});

module.exports = router;
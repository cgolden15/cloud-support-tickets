const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { requireAdmin, requireSuperAdmin, addUserToLocals } = require('../middleware/auth');

const router = express.Router();

// Add user to all admin routes
router.use(addUserToLocals);

// Admin dashboard
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    const tickets = await Ticket.findAll();
    const stats = await Ticket.getStats();
    
    res.render('admin/dashboard', { 
      title: 'Admin Dashboard',
      users: users,
      tickets: tickets,
      stats: stats
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('error', { 
      message: 'Error loading admin dashboard',
      error: {}
    });
  }
});

// User management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.render('admin/users', { 
      title: 'User Management',
      users: users,
      error: req.session.flash?.error || null,
      success: req.session.flash?.success || null
    });
    
    // Clear flash messages
    delete req.session.flash;
  } catch (error) {
    console.error('User management error:', error);
    res.render('error', { 
      message: 'Error loading users',
      error: {}
    });
  }
});

// Create user form
router.get('/users/new', requireSuperAdmin, (req, res) => {
  res.render('admin/user-form', { 
    title: 'Create New User',
    user: null,
    error: null
  });
});

// Create user handler
router.post('/users/new', requireSuperAdmin, [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['staff', 'admin', 'super_admin']).withMessage('Valid role is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('admin/user-form', { 
      title: 'Create New User',
      user: null,
      error: errors.array()[0].msg,
      formData: req.body
    });
  }

  try {
    const { username, email, password, role, firstName, lastName } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findByUsername(username) || await User.findByEmail(email);
    if (existingUser) {
      return res.render('admin/user-form', { 
        title: 'Create New User',
        user: null,
        error: 'Username or email already exists',
        formData: req.body
      });
    }

    await User.create({
      username,
      email,
      password,
      role,
      firstName,
      lastName
    });

    req.session.flash = { success: 'User created successfully' };
    res.redirect('/admin/users');
  } catch (error) {
    console.error('User creation error:', error);
    res.render('admin/user-form', { 
      title: 'Create New User',
      user: null,
      error: 'Error creating user',
      formData: req.body
    });
  }
});

// Edit user form
router.get('/users/:id/edit', requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).render('error', { 
        message: 'User not found',
        error: {}
      });
    }
    
    res.render('admin/user-form', { 
      title: 'Edit User',
      user: user,
      error: null
    });
  } catch (error) {
    console.error('User edit form error:', error);
    res.render('error', { 
      message: 'Error loading user',
      error: {}
    });
  }
});

// Update user handler
router.post('/users/:id/edit', requireSuperAdmin, [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['staff', 'admin', 'super_admin']).withMessage('Valid role is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('active').isIn(['0', '1']).withMessage('Valid active status is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const user = await User.findById(req.params.id);
    return res.render('admin/user-form', { 
      title: 'Edit User',
      user: user,
      error: errors.array()[0].msg,
      formData: req.body
    });
  }

  try {
    const { username, email, role, firstName, lastName, active } = req.body;

    await User.update(req.params.id, {
      username,
      email,
      role,
      firstName,
      lastName,
      active: parseInt(active)
    });

    req.session.flash = { success: 'User updated successfully' };
    res.redirect('/admin/users');
  } catch (error) {
    console.error('User update error:', error);
    const user = await User.findById(req.params.id);
    res.render('admin/user-form', { 
      title: 'Edit User',
      user: user,
      error: 'Error updating user',
      formData: req.body
    });
  }
});

// Delete user
router.post('/users/:id/delete', requireSuperAdmin, async (req, res) => {
  try {
    // Prevent deleting the last super admin
    const superAdmins = await User.findAll();
    const activeSuperAdmins = superAdmins.filter(u => u.role === 'super_admin' && u.active === 1);
    
    const userToDelete = await User.findById(req.params.id);
    if (userToDelete.role === 'super_admin' && activeSuperAdmins.length === 1) {
      req.session.flash = { error: 'Cannot delete the last super admin user' };
      return res.redirect('/admin/users');
    }

    await User.delete(req.params.id);
    req.session.flash = { success: 'User deleted successfully' };
    res.redirect('/admin/users');
  } catch (error) {
    console.error('User delete error:', error);
    req.session.flash = { error: 'Error deleting user' };
    res.redirect('/admin/users');
  }
});

// Profile management for all authenticated users
router.get('/profile', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.render('admin/profile', { 
      title: 'My Profile',
      user: user,
      error: req.session.flash?.error || null,
      success: req.session.flash?.success || null
    });
    
    delete req.session.flash;
  } catch (error) {
    console.error('Profile error:', error);
    res.render('error', { 
      message: 'Error loading profile',
      error: {}
    });
  }
});

// Update profile
router.post('/profile', requireAdmin, [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.session.flash = { error: errors.array()[0].msg };
    return res.redirect('/admin/profile');
  }

  try {
    const { username, email, firstName, lastName } = req.body;
    const currentUser = await User.findById(req.user.id);

    await User.update(req.user.id, {
      username,
      email,
      role: currentUser.role, // Keep current role
      firstName,
      lastName,
      active: currentUser.active // Keep current active status
    });

    req.session.flash = { success: 'Profile updated successfully' };
    res.redirect('/admin/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.session.flash = { error: 'Error updating profile' };
    res.redirect('/admin/profile');
  }
});

// Change password
router.post('/profile/password', requireAdmin, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.session.flash = { error: errors.array()[0].msg };
    return res.redirect('/admin/profile');
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isValidPassword = await User.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      req.session.flash = { error: 'Current password is incorrect' };
      return res.redirect('/admin/profile');
    }

    await User.updatePassword(req.user.id, newPassword);
    req.session.flash = { success: 'Password changed successfully' };
    res.redirect('/admin/profile');
  } catch (error) {
    console.error('Password change error:', error);
    req.session.flash = { error: 'Error changing password' };
    res.redirect('/admin/profile');
  }
});

module.exports = router;
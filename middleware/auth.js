const User = require('../models/User');

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/auth/login');
    }

    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/auth/login');
      }

      if (roles.includes(user.role)) {
        req.user = user;
        return next();
      } else {
        return res.status(403).render('error', {
          message: 'Access denied. Insufficient permissions.',
          error: {}
        });
      }
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).render('error', {
        message: 'Authorization error',
        error: {}
      });
    }
  };
};

// Middleware to add user info to all requests
const addUserToLocals = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        res.locals.currentUser = user;
        req.user = user;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }
  next();
};

// Check if user is super admin
const requireSuperAdmin = requireRole(['super_admin']);

// Check if user is admin or super admin
const requireAdmin = requireRole(['admin', 'super_admin']);

// Check if user is any authenticated user
const requireStaff = requireRole(['staff', 'admin', 'super_admin']);

module.exports = {
  requireAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireStaff,
  addUserToLocals
};
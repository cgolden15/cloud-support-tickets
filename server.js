const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for Azure App Service (handles HTTPS termination)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  },
  // Use default memory store but with cleanup to prevent memory leaks
  name: 'sessionId'
}));

// Routes
app.use('/', publicRoutes);
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Database initialization endpoint (for production deployment)
app.get('/init-database', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const initProcess = spawn('node', ['scripts/initDb.js']);
    
    let output = '';
    initProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    initProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    initProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Database initialized successfully',
          output: output
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Database initialization failed',
          output: output
        });
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error initializing database',
      error: error.message
    });
  }
});

// Debug endpoint to check users (remove after troubleshooting)
app.get('/debug-users', async (req, res) => {
  try {
    const db = require('./models/database');
    const User = require('./models/User');
    
    const users = await db.all('SELECT id, username, email, role, active, password, created_at FROM users ORDER BY created_at DESC');
    
    // Test password verification for admin user
    let passwordTest = null;
    if (users.length > 0) {
      const adminUser = users.find(u => u.username === 'admin');
      if (adminUser) {
        passwordTest = {
          username: adminUser.username,
          hasPassword: !!adminUser.password,
          passwordLength: adminUser.password ? adminUser.password.length : 0,
          passwordStartsWith: adminUser.password ? adminUser.password.substring(0, 10) + '...' : 'N/A',
          verifyTest: await User.verifyPassword('admin123', adminUser.password)
        };
      }
    }
    
    res.json({ 
      success: true, 
      message: `Found ${users.length} users`,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        active: u.active,
        hasPassword: !!u.password,
        created_at: u.created_at
      })),
      dbType: process.env.DB_TYPE,
      currentDbInstance: db.dbType,
      passwordTest: passwordTest
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users',
      error: error.message,
      dbType: process.env.DB_TYPE
    });
  }
});

// Test login endpoint (remove after troubleshooting)
app.post('/debug-login', async (req, res) => {
  try {
    const User = require('./models/User');
    const { username = 'admin', password = 'admin123' } = req.body;
    
    console.log(`Debug login attempt: ${username} / ${password}`);
    
    const user = await User.findByUsername(username);
    console.log('Found user:', user ? { id: user.id, username: user.username, active: user.active } : 'No user found');
    
    if (!user) {
      return res.json({ 
        success: false, 
        message: 'User not found',
        username: username
      });
    }
    
    const isValidPassword = await User.verifyPassword(password, user.password);
    console.log('Password verification result:', isValidPassword);
    
    res.json({ 
      success: isValidPassword, 
      message: isValidPassword ? 'Login successful' : 'Invalid password',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Debug login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login test',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: {}
  });
});

app.listen(PORT, () => {
  console.log(`IT Ticketing System running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
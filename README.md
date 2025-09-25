# IT Ticketing System

A professional IT ticketing system built with Node.js and Express, ready for Azure App Service deployment.

## Features

### Public Features
- **Public ticket submission** - Users can submit IT support requests
- **Ticket status checking** - Users can check the status of their tickets
- **Responsive design** - Works on all devices

### Staff Features
- **Secure authentication** - Username/password login with session management
- **Dashboard** - Overview of ticket statistics and recent activity
- **Ticket management** - View, edit, assign, and comment on tickets
- **Status tracking** - Open, In Progress, Resolved, Closed
- **Priority levels** - Low, Medium, High, Urgent

### Admin Features
- **User management** - Create, edit, and manage user accounts
- **Role-based permissions** - Staff, Admin, Super Admin roles
- **Profile management** - Users can manage their own profiles
- **Admin dashboard** - System overview and quick actions

## Security Features

- **Password hashing** with bcrypt
- **Session management** with secure cookies
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **SQL injection protection**
- **XSS protection** with Helmet.js
- **Account lockout** after failed login attempts

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   npm run init-db
   ```

4. Start the application:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`

### Default Admin Account
- **Username:** admin
- **Password:** admin123
- **Important:** Change this password immediately after first login!

## Configuration

### Environment Variables

Copy `.env` file and modify as needed:

- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session encryption key (change in production!)
- `DB_PATH` - SQLite database path
- `BCRYPT_ROUNDS` - Password hashing strength
- `MAX_LOGIN_ATTEMPTS` - Failed login limit
- `LOCKOUT_TIME` - Account lockout duration

### Database

The system uses SQLite by default, which is perfect for small to medium businesses. The database is automatically created and initialized on first run.

## Azure App Service Deployment

This application is ready for Azure App Service deployment:

### Option 1: Direct Deployment
1. Create an Azure App Service (Node.js)
2. Deploy the code using Git, VS Code, or ZIP deployment
3. Set environment variables in App Service Configuration
4. The app will automatically start

### Option 2: Container Deployment
1. Build Docker image (Dockerfile included)
2. Push to Azure Container Registry
3. Deploy to App Service from container

### Required Azure Configuration
- Set `NODE_ENV=production`
- Update `SESSION_SECRET` to a secure random string
- Configure any other environment variables as needed

## User Roles

### Staff
- View and manage tickets
- Add comments to tickets
- Update own profile

### Admin  
- All Staff permissions
- View admin dashboard
- Manage user accounts (view/edit)

### Super Admin
- All Admin permissions
- Create new users
- Delete user accounts
- Full system access

## API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /submit` - Submit ticket form
- `POST /submit` - Submit ticket
- `GET /status` - Check ticket status form
- `POST /status` - Check ticket status

### Authentication
- `GET /auth/login` - Login form
- `POST /auth/login` - Login handler
- `POST /auth/logout` - Logout

### Staff/Admin Routes (requires authentication)
- `GET /tickets` - Dashboard
- `GET /tickets/list` - All tickets
- `GET /tickets/:id` - View ticket
- `POST /tickets/:id/update` - Update ticket
- `POST /tickets/:id/comment` - Add comment

### Admin Routes (requires admin role)
- `GET /admin` - Admin dashboard
- `GET /admin/users` - User management
- `GET /admin/profile` - User profile

## Database Schema

### Users Table
- id, username, email, password
- role (staff/admin/super_admin)
- first_name, last_name, active
- failed_login_attempts, locked_until
- created_at, updated_at

### Tickets Table
- id, title, description
- submitter_name, submitter_email
- priority, category, status
- assigned_to (user_id)
- created_at, updated_at

### Ticket Comments Table
- id, ticket_id, user_id
- comment, created_at

## Support

For issues or questions about this IT ticketing system, please create an issue in the repository or contact your system administrator.

## License

MIT License - see LICENSE file for details.
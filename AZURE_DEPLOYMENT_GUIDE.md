# Azure Deployment Guide

This guide covers deploying the IT Ticketing System to Azure App Service with different database options.

## Database Options for Azure

### 1. Azure SQL Database (Recommended for Production)

**Pros:**
- ✅ Fully managed by Microsoft
- ✅ Automatic backups and high availability
- ✅ Scales well with your application
- ✅ Free tier available (32MB, perfect for small businesses)
- ✅ Works perfectly with Azure App Service

**Cons:**
- 💰 Can be more expensive as you scale
- 🔧 Requires Azure SQL setup

**Setup:**
1. Create Azure SQL Database (Free Tier)
2. Configure connection string in App Service
3. Set `DB_TYPE=mssql` in environment variables

### 2. Azure Database for PostgreSQL (Good Alternative)

**Pros:**
- ✅ Open source
- ✅ Flexible pricing
- ✅ Good performance
- ✅ Azure managed service

**Cons:**
- 💰 No completely free tier
- 🔧 Requires PostgreSQL knowledge

### 3. SQLite (Development Only)

**Pros:**
- ✅ Simple setup
- ✅ No external dependencies
- ✅ Perfect for local development

**Cons:**
- ❌ **Not recommended for Azure production**
- ❌ File system limitations on Azure
- ❌ Doesn't scale with multiple instances
- ❌ Data loss risk during app restarts

## Recommended Azure Setup

### Option 1: Azure SQL Database (Free Tier)

**Step 1: Create Azure SQL Database**
```bash
# Create resource group
az group create --name rg-ticketing --location eastus

# Create SQL server
az sql server create \
  --name your-sql-server-name \
  --resource-group rg-ticketing \
  --location eastus \
  --admin-user sqladmin \
  --admin-password YourSecurePassword123!

# Create database (Free tier)
az sql db create \
  --resource-group rg-ticketing \
  --server your-sql-server-name \
  --name ticketing-db \
  --service-objective Free
```

**Step 2: Configure App Service**
```bash
# Create App Service plan (Free tier)
az appservice plan create \
  --name plan-ticketing \
  --resource-group rg-ticketing \
  --sku F1 \
  --is-linux

# Create web app
az webapp create \
  --resource-group rg-ticketing \
  --plan plan-ticketing \
  --name your-ticketing-app \
  --runtime "NODE:18-lts"
```

**Step 3: Set Environment Variables**
```bash
az webapp config appsettings set \
  --resource-group rg-ticketing \
  --name your-ticketing-app \
  --settings \
    NODE_ENV=production \
    DB_TYPE=mssql \
    DB_SERVER=your-sql-server-name.database.windows.net \
    DB_NAME=ticketing-db \
    DB_USER=sqladmin \
    DB_PASSWORD=YourSecurePassword123! \
    SESSION_SECRET=YourRandomSessionSecret123! \
    BCRYPT_ROUNDS=12
```

### Option 2: PostgreSQL on Azure

**Step 1: Create PostgreSQL Database**
```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group rg-ticketing \
  --name your-postgres-server \
  --location eastus \
  --admin-user postgresadmin \
  --admin-password YourSecurePassword123! \
  --sku-name B_Gen5_1 \
  --version 11

# Create database
az postgres db create \
  --resource-group rg-ticketing \
  --server-name your-postgres-server \
  --name ticketing-db
```

**Step 2: Set Environment Variables**
```bash
az webapp config appsettings set \
  --resource-group rg-ticketing \
  --name your-ticketing-app \
  --settings \
    NODE_ENV=production \
    DB_TYPE=postgresql \
    DB_HOST=your-postgres-server.postgres.database.azure.com \
    DB_NAME=ticketing-db \
    DB_USER=postgresadmin@your-postgres-server \
    DB_PASSWORD=YourSecurePassword123! \
    DB_PORT=5432 \
    SESSION_SECRET=YourRandomSessionSecret123!
```

### Option 3: SQLite (Local Development Only)

**For local development only:**
```bash
# Set environment variables for local development
DB_TYPE=sqlite
DB_PATH=./database/tickets.db
```

## Deployment Methods

### Method 1: Visual Studio Code Extension

1. Install "Azure App Service" extension
2. Sign in to Azure
3. Right-click project folder
4. Select "Deploy to Web App"
5. Choose your App Service

### Method 2: GitHub Actions (CI/CD)

Create `.github/workflows/azure-deploy.yml`:
```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'your-ticketing-app'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

### Method 3: Azure CLI

```bash
# Deploy from local folder
az webapp deployment source config-zip \
  --resource-group rg-ticketing \
  --name your-ticketing-app \
  --src app.zip
```

## Cost Estimation (Free Tier)

### Azure SQL Database (Free)
- **Database:** Free tier (32MB storage)
- **Compute:** Included in App Service
- **Monthly Cost:** $0

### App Service (Free)
- **F1 Plan:** Free tier
- **Limitations:** 60 minutes/day, 1GB storage
- **Monthly Cost:** $0

### Total Free Tier Cost: $0/month
*Perfect for small business with basic needs*

### Upgrade Path (Small Business)
- **App Service:** B1 Basic ($13/month)
- **Azure SQL:** S0 Standard ($15/month)
- **Total:** ~$28/month

## Security Checklist for Production

- [ ] Change default admin password
- [ ] Use strong SESSION_SECRET
- [ ] Enable HTTPS only
- [ ] Configure Azure SQL firewall rules
- [ ] Set up backup retention
- [ ] Enable Application Insights for monitoring
- [ ] Configure custom domain and SSL

## Monitoring and Maintenance

### Application Insights
```bash
# Enable Application Insights
az webapp config appsettings set \
  --resource-group rg-ticketing \
  --name your-ticketing-app \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

### Backup Strategy
- Azure SQL: Automatic backups (point-in-time restore)
- App Service: Deployment slots for zero-downtime updates

## Troubleshooting

### Common Issues

1. **Database Connection Fails**
   - Check firewall rules on Azure SQL
   - Verify connection string format
   - Ensure database exists

2. **App Won't Start**
   - Check Application Logs in Azure Portal
   - Verify all environment variables are set
   - Check Node.js version compatibility

3. **SQLite Issues on Azure**
   - Switch to Azure SQL Database
   - SQLite is not recommended for Azure production

### Logs and Debugging
```bash
# View application logs
az webapp log tail --resource-group rg-ticketing --name your-ticketing-app

# Download logs
az webapp log download --resource-group rg-ticketing --name your-ticketing-app
```

## Migration from SQLite to Azure SQL

If you start with SQLite and want to migrate:

1. Export SQLite data
2. Create Azure SQL Database
3. Update environment variables
4. Import data to Azure SQL
5. Test thoroughly
6. Deploy updated configuration

The application automatically handles the different database types, so no code changes are needed!

## Next Steps

1. Choose your database option (Azure SQL recommended)
2. Set up Azure resources
3. Configure environment variables
4. Deploy the application
5. Test thoroughly
6. Change default admin password
7. Set up monitoring and backups

Your IT ticketing system will be ready for production use!
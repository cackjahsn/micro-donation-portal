# Docker Setup Guide for Micro-Donation Portal

## 🐋 Migration from XAMPP to Docker

This guide will help you switch from XAMPP to Docker for local development.

---

## ✅ Prerequisites

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop/
   - For Windows: Enable WSL 2 backend (recommended)
   - Start Docker Desktop after installation

2. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

---

## 🚀 Quick Start

### Step 1: Copy Docker Environment
```bash
# Copy the Docker-specific environment file
copy .env.docker .env
```

### Step 2: Start Docker Containers
```bash
# From project root directory
docker-compose up -d
```

### Step 3: Verify Containers are Running
```bash
docker-compose ps
```

You should see 3 containers:
- `micro-donation-web` (Apache + PHP)
- `micro-donation-db` (MySQL)
- `micro-donation-phpmyadmin` (Database UI)

### Step 4: Access the Application
- **Application**: http://localhost:8000
- **phpMyAdmin**: http://localhost:8080
  - Username: `root`
  - Password: `rootpassword`

---

## 📋 What's Included

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web Application** | http://localhost:8000 | - |
| **phpMyAdmin** | http://localhost:8080 | root / rootpassword |
| **MySQL Database** | localhost:3306 | microdonation_user / microdonation_password |

---

## 🔧 Common Commands

### Start Containers
```bash
docker-compose up -d
```

### Stop Containers
```bash
docker-compose down
```

### Stop and Remove Volumes (⚠️ Deletes Database!)
```bash
docker-compose down -v
```

### View Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f db
```

### Restart a Service
```bash
docker-compose restart web
docker-compose restart db
```

### Rebuild Containers
```bash
# After changing Dockerfile or docker-compose.yml
docker-compose up -d --build
```

### Access Container Shell
```bash
# Web container (Apache + PHP)
docker-compose exec web bash

# Database container
docker-compose exec db bash

# MySQL CLI inside container
docker-compose exec db mysql -u root -prootpassword
```

---

## 🗄️ Database Setup

### Option 1: Import Existing Database from XAMPP

1. **Export from XAMPP (phpMyAdmin)**
   - Go to http://localhost/phpmyadmin
   - Select `micro_donation_db`
   - Click "Export" → "Go"
   - Save as `backup.sql`

2. **Import to Docker**
   ```bash
   # Copy SQL file to container
   docker cp backup.sql micro-donation-db:/backup.sql

   # Import database
   docker-compose exec db mysql -u root -prootpassword micro_donation_db < backup.sql
   ```

3. **Or use phpMyAdmin**
   - Go to http://localhost:8080
   - Select `micro_donation_db`
   - Click "Import" → Choose your SQL file → "Go"

### Option 2: Create Fresh Database

1. Open phpMyAdmin: http://localhost:8080
2. Login with `root` / `rootpassword`
3. Create tables manually or import schema

---

## 📝 Configuration Changes from XAMPP

### Update `.env` File
```env
# XAMPP Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=

# Docker Configuration (use .env.docker)
DB_HOST=db
DB_USER=microdonation_user
DB_PASS=microdonation_password
```

### Update Application URLs
- **XAMPP**: http://localhost/micro-donation-portal/
- **Docker**: http://localhost:8000/

---

## 🔍 Troubleshooting

### Issue: Campaign Images Not Loading (404 Errors)

**Symptoms**: Campaign images show broken image icons or 404 errors in console.

**Solution**:

1. **Restart containers** to apply volume mounts:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Hard refresh browser** (Ctrl+Shift+R or Ctrl+F5)

3. **Verify images exist in container**:
   ```bash
   docker-compose exec web ls -la /var/www/html/uploads/campaigns/
   ```

4. **Test image accessibility from container**:
   ```bash
   docker-compose exec web curl -I http://localhost/uploads/campaigns/campaign_5_1772092564.jpg
   # Should return HTTP/1.1 200 OK
   ```

5. **Check Docker Desktop file sharing** (Windows):
   - Open Docker Desktop Settings
   - Go to Settings → Resources → File Sharing
   - Ensure `C:\Users` is in the list
   - Click "Apply & Restart"

6. **Verify volume mounts**:
   ```bash
   docker-compose exec web mount | grep www
   ```

**Note**: Some campaigns may reference images that don't exist on disk. These will show the default placeholder image (which is expected behavior).

### Issue: Port Already in Use
```bash
# Check what's using port 8000
netstat -ano | findstr :8000

# Solution: Change port in docker-compose.yml
ports:
  - "8001:80"  # Change 8000 to 8001
```

### Issue: Containers Won't Start
```bash
# Check Docker Desktop is running
# Restart Docker Desktop if needed

# View detailed error logs
docker-compose logs

# Rebuild containers
docker-compose up -d --build --force-recreate
```

### Issue: Database Connection Error
```bash
# Check if database container is healthy
docker-compose ps

# Check database logs
docker-compose logs db

# Test connection from web container
docker-compose exec web bash
# Inside container:
ping db
```

### Issue: Permission Denied on Uploads
```bash
# Fix permissions
docker-compose exec web chown -R www-data:www-data /var/www/html/uploads
docker-compose exec web chmod -R 755 /var/www/html/uploads
```

### Issue: Changes Not Reflecting
```bash
# Clear browser cache (Ctrl+Shift+R)

# Restart web container
docker-compose restart web

# Check volume is mounted correctly
docker-compose exec web ls -la /var/www/html
```

---

## 🛡️ Security Notes

> ⚠️ **Development Only**: This Docker setup is for local development only.

**Default Credentials (Change for Production!)**:
- MySQL root: `rootpassword`
- Application user: `microdonation_password`
- phpMyAdmin: `root` / `rootpassword`

**For Production**:
1. Change all passwords in `docker-compose.yml`
2. Use `.env` file for sensitive data
3. Don't commit `.env` to Git
4. Enable HTTPS
5. Use production PHP settings

---

## 📦 File Structure

```
micro-donation-portal/
├── docker-compose.yml          # Docker services configuration
├── Dockerfile                  # PHP + Apache image definition
├── .env.docker                 # Docker environment template
├── docker/
│   ├── mysql/
│   │   └── init.sql           # Database initialization
│   └── apache/
│       └── sites/
│           └── 000-default.conf  # Apache virtual host config
└── ... (your application files)
```

---

## 🎯 Advantages of Docker over XAMPP

| Feature | XAMPP | Docker |
|---------|-------|--------|
| **Isolation** | System-wide | Containerized |
| **Version Control** | Manual | Image-based |
| **Portability** | OS-dependent | Cross-platform |
| **Multiple Projects** | Conflicts | Isolated |
| **Cleanup** | Manual uninstall | `docker-compose down` |
| **Team Consistency** | Different setups | Same environment |

---

## 🔄 Switching Back to XAMPP

1. **Stop Docker containers**
   ```bash
   docker-compose down
   ```

2. **Update `.env` file**
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   ```

3. **Start XAMPP** (Apache + MySQL)

4. **Access via**: http://localhost/micro-donation-portal/

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PHP Docker Image](https://hub.docker.com/_/php)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)

---

**Created**: March 2026
**Status**: Ready for Use

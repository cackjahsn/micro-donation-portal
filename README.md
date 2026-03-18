# 🌟 Micro-Donation Community Web Portal

A full-stack web application for facilitating micro-donations within local communities using QR payment integration.

![Status](https://img.shields.io/badge/status-development-yellow)
![PHP](https://img.shields.io/badge/PHP-8.2+-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red)

> ⚠️ **Educational Project** - This is a student project for learning purposes. Not intended for production use.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start (Docker)](#-quick-start-docker)
- [Alternative Setup (XAMPP)](#-alternative-setup-xampp)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 📖 Overview

**CommunityGive** is a micro-donation platform that connects donors with local community campaigns. The system emphasizes transparency, ease of use, and small-scale contributions to make a big impact.

### Purpose

This project demonstrates:
- Full-stack web development with PHP and MySQL
- Secure authentication and authorization
- Payment gateway integration (simulated)
- Transparent donation tracking
- Modern frontend development practices
- Containerized deployment with Docker

---

## ✨ Features

### For Donors
- Browse active donation campaigns
- Quick donation via QR code payment
- Anonymous donation option
- Digital receipt generation
- Donation history tracking
- User profile management

### For Administrators
- Campaign management (create, edit, delete)
- User and donor management
- Analytics dashboard with charts
- Report generation
- Receipt verification system

### Transparency
- Public donation statistics
- Recent donations feed
- Campaign progress tracking
- Platform fee disclosure

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **CSS Framework** | Bootstrap 5 + Custom Dark Theme |
| **Backend** | PHP 8.2 (Vanilla) |
| **Database** | MySQL 8.0 |
| **Charts** | Chart.js |
| **HTTP Client** | jQuery |
| **Payment** | Simulated QR Code |
| **Server** | Apache (Dockerized) |
| **Containerization** | Docker & Docker Compose |

### Development Tools
- VS Code
- Docker Desktop
- phpMyAdmin (included in Docker)

---

## 🚀 Quick Start (Docker) - Recommended

### Prerequisites

- **Docker Desktop** installed and running
  - Download: https://www.docker.com/products/docker-desktop/
  - For Windows: Enable WSL 2 backend (recommended)

### Setup Instructions

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd micro-donation-portal
```

#### 2. Configure Docker Environment

```bash
# Copy Docker environment configuration
copy .env.docker .env
```

#### 3. Start All Services

```bash
# Start web server, database, and phpMyAdmin
docker-compose up -d
```

#### 4. Verify Services

```bash
# Check all containers are running
docker-compose ps
```

#### 5. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| **Application** | http://localhost:8000 | - |
| **phpMyAdmin** | http://localhost:8080 | root / rootpassword |

#### 6. Test Login

Use these test accounts (development only):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@communitygive.com` | (auto-login in dev mode) |
| User | `testuser@example.com` | (auto-login in dev mode) |

---

## 🐳 Docker Commands

### Start Containers
```bash
docker-compose up -d
```

### Stop Containers
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f db
```

### Restart Services
```bash
docker-compose restart web
```

### Rebuild After Changes
```bash
docker-compose up -d --build
```

### Access Container Shell
```bash
# Web container
docker-compose exec web bash

# Database container
docker-compose exec db bash

# MySQL CLI
docker-compose exec db mysql -u root -prootpassword
```

### Import Database Backup
```bash
# From host
docker cp backup.sql micro-donation-db:/backup.sql
docker-compose exec db mysql -u root -prootpassword micro_donation_db < /backup.sql
```

---

## 💻 Alternative Setup (XAMPP)

> ⚠️ **Note:** Docker is recommended. XAMPP setup is provided for compatibility.

### Prerequisites

- XAMPP (or equivalent PHP + MySQL stack)
- PHP 8.0+
- MySQL 5.7+

### Setup Instructions

#### 1. Configure Environment

```bash
copy .env.example .env
```

Update `.env`:
```env
DB_HOST=localhost
DB_NAME=micro_donation_db
DB_USER=root
DB_PASS=
APP_ENV=development
```

#### 2. Create Database

```sql
CREATE DATABASE micro_donation_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 3. Start XAMPP

1. Open XAMPP Control Panel
2. Start **Apache**
3. Start **MySQL**

#### 4. Access Application

```
http://localhost/micro-donation-portal/
```

---

## 📱 Usage

### For Visitors

1. Browse campaigns on the homepage
2. Register for a free account
3. Login to access donation features

### For Donors

1. Select a campaign to support
2. Choose donation amount (starting from RM1)
3. Complete payment via QR code
4. Download receipt for your records

### For Administrators

> Access to admin features requires administrator privileges.

1. Login with admin credentials
2. Access the admin dashboard at http://localhost:8000/admin-dashboard.html
3. Manage campaigns, users, and view analytics

---

## 📂 Project Structure

```
micro-donation-portal/
├── docker-compose.yml          # Docker services configuration
├── Dockerfile                  # PHP + Apache container
├── .env.docker                 # Docker environment template
├── .env.example                # XAMPP environment template
├── index.html                  # Homepage
├── register.html               # Registration page
├── donation-page.html          # Donation interface
├── admin-dashboard.html        # Admin panel
├── pages/                      # Additional pages
│   ├── campaigns.html
│   ├── about.html
│   ├── contact.html
│   ├── transparency.html
│   └── profile.html
├── backend/                    # PHP backend API
│   ├── config/                 # Configuration files
│   ├── models/                 # Data models
│   └── api/                    # REST API endpoints
│       ├── auth/               # Authentication
│       ├── campaigns/          # Campaign management
│       ├── donations/          # Donation processing
│       ├── payment/            # QR payment
│       └── transparency/       # Public feed
├── js/                         # JavaScript modules
│   ├── path-resolver.js        # Dynamic path detection
│   ├── auth.js                 # Authentication manager
│   ├── utils.js                # Utilities
│   ├── donation.js             # Donation flow
│   └── ...
├── css/                        # Stylesheets
├── assets/                     # Static assets
├── uploads/                    # User uploads
├── docker/                     # Docker configuration
│   ├── mysql/                  # Database init scripts
│   ├── apache/                 # Apache config
│   └── README.md               # Docker setup guide
└── documentation/              # Project documentation
```

---

## 🔒 Security

This project implements several security measures:

- **Password Hashing**: BCRYPT algorithm for secure password storage
- **Prepared Statements**: PDO to prevent SQL injection
- **Input Sanitization**: All user inputs are sanitized
- **Token-Based Auth**: Secure session management
- **Role-Based Access**: Admin and user roles
- **CORS Configuration**: Controlled cross-origin requests
- **Environment Variables**: Sensitive config in `.env`

### Security Best Practices

> ⚠️ **Important**: This is a learning project. Before deploying to production:

1. Change all default credentials
2. Enable HTTPS/SSL
3. Update `.env` with strong database passwords
4. Disable error display in production
5. Implement rate limiting
6. Add CSRF protection
7. Conduct security audit
8. Use environment-specific configurations

### Default Credentials (Development Only)

| Service | Username | Password |
|---------|----------|----------|
| **phpMyAdmin** | root | rootpassword |
| **MySQL** | root | rootpassword |
| **MySQL (App)** | microdonation_user | microdonation_password |

> ⚠️ **Change these for production!**

---

## 🐛 Troubleshooting

### Campaign Images Not Loading

**Symptoms**: Broken image icons or 404 errors in console.

**Solution**:
```bash
# 1. Restart containers
docker-compose down
docker-compose up -d

# 2. Hard refresh browser (Ctrl+Shift+R)

# 3. Verify images exist
docker-compose exec web ls -la /var/www/html/uploads/campaigns/

# 4. Test accessibility
docker-compose exec web curl -I http://localhost/uploads/campaigns/campaign_5_1772092564.jpg
```

**Note**: Some campaigns may reference images that don't exist - they show a default placeholder.

### Port Already in Use

```bash
# Check what's using port 8000
netstat -ano | findstr :8000

# Solution: Change port in docker-compose.yml
ports:
  - "8001:80"  # Change 8000 to 8001
```

### Containers Won't Start

```bash
# Check Docker Desktop is running
# Restart Docker Desktop if needed

# View detailed logs
docker-compose logs

# Rebuild containers
docker-compose up -d --build --force-recreate
```

### Database Connection Error

```bash
# Check database container is healthy
docker-compose ps

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec web bash
ping db
```

### Docker Desktop File Sharing (Windows)

If images or files aren't accessible:

1. Open Docker Desktop Settings
2. Go to Settings → Resources → File Sharing
3. Ensure `C:\Users` is in the list
4. Click "Apply & Restart"

For more detailed troubleshooting, see [docker/README.md](docker/README.md) or [documentation/QUICK_START.md](documentation/QUICK_START.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- **PHP**: PSR-12 coding standard
- **JavaScript**: ES6+ with semicolons
- **CSS**: BEM-like naming with CSS custom properties
- **HTML**: Semantic HTML5 with Bootstrap 5

### Development Workflow

```bash
# Start Docker
docker-compose up -d

# Make changes (auto-reload enabled)
# Files are mounted via Docker volumes

# View logs
docker-compose logs -f web

# Test changes at http://localhost:8000
```

---

## 📄 License & Copyright

> ⚠️ **All Rights Reserved** - This project is under development and not yet published.
>
> The code, design, and documentation are the property of the author. Unauthorized use, copying, or distribution is prohibited.
>
> A license will be chosen upon official release.

---

## 👤 Author

**Khairil Aiman Bin Mohd Azahari Shah**

- **Project Code:** BPJ241210141
- **Institution:** [Educational Institution]

> 📧 For inquiries or collaboration opportunities, please contact through GitHub issues.

---

## 📈 Future Enhancements

- [ ] Real payment gateway integration
- [ ] Email notifications
- [ ] SMS verification
- [ ] Multi-language support
- [ ] Recurring donations
- [ ] Advanced analytics
- [ ] Automated testing suite
- [ ] CI/CD pipeline

---

## 🙏 Acknowledgments

- Bootstrap team for the CSS framework
- Chart.js for data visualization
- jQuery team for the HTTP client library
- Docker team for containerization tools

---

## 📞 Support

For questions and support:
- Open an issue on GitHub
- Check the [documentation](documentation/) folder
- Review [docker/README.md](docker/README.md) for Docker-specific help
- Review existing issues for similar problems

---

**Last Updated:** March 2026

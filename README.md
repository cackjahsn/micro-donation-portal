# 🌟 Micro-Donation Community Web Portal

A full-stack web application for facilitating micro-donations within local communities using QR payment integration.

![Status](https://img.shields.io/badge/status-active-success)
![PHP](https://img.shields.io/badge/PHP-8.0+-blue)
![MySQL](https://img.shields.io/badge/MySQL-5.7+-orange)
![License](https://img.shields.io/badge/license-MIT-green)

> ⚠️ **Educational Project** - This is a student project for learning purposes. Not intended for production use.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
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
| **CSS Framework** | Bootstrap 5 |
| **Backend** | PHP (Vanilla) |
| **Database** | MySQL |
| **Charts** | Chart.js |
| **HTTP Client** | jQuery |
| **Payment** | Simulated QR Code |
| **Server** | Apache (XAMPP) |

### Development Tools
- VS Code
- XAMPP
- phpMyAdmin

---

## 🚀 Installation

### Prerequisites

- XAMPP (or equivalent PHP + MySQL stack)
- PHP 8.0+
- MySQL 5.7+

### Setup Instructions

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd micro-donation-portal
```

#### 2. Configure Environment

Copy `.env.example` to `.env` and update with your credentials:

```env
DB_HOST=localhost
DB_NAME=your_database_name
DB_USER=your_username
DB_PASS=your_password
APP_ENV=development
```

> 🔒 **Security Note:** The `.env` file is excluded from version control. Never commit sensitive credentials.

#### 3. Create Database

```sql
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 4. Import Schema

Import the database schema from `documentation/schema.sql` (if available) or follow the setup guide.

#### 5. Start the Application

Place the project in your web server's root directory and access via:

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
2. Choose donation amount
3. Complete payment via QR code
4. Download receipt for your records

### For Administrators

> Access to admin features requires administrator privileges. Contact the project maintainer for more information.

1. Login with admin credentials
2. Access the admin dashboard
3. Manage campaigns, users, and view analytics

---

## 📂 Project Structure

```
micro-donation-portal/
├── index.html                    # Homepage
├── register.html                 # Registration page
├── donation-page.html            # Donation interface
├── admin-dashboard.html          # Admin panel
├── pages/                        # Additional pages
├── backend/                      # PHP backend API
│   ├── config/                   # Configuration files
│   ├── models/                   # Data models
│   └── api/                      # API endpoints
├── js/                           # JavaScript modules
├── css/                          # Stylesheets
├── assets/                       # Static assets
├── uploads/                      # User uploads
└── documentation/                # Project documentation
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

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
- Verify MySQL is running
- Check `.env` credentials
- Ensure database exists

**404 Errors**
- Confirm Apache is running
- Check `.htaccess` files are present
- Verify correct URL path

**Upload Failures**
- Check folder permissions
- Verify PHP upload settings in `php.ini`

For more detailed troubleshooting, see [documentation/QUICK_START.md](documentation/QUICK_START.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow PSR-12 for PHP code
- Use ES6+ for JavaScript
- Add meaningful comments
- Write clear commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2024 Khairil Aiman Bin Mohd Azahari Shah

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 👤 Author

**Khairil Aiman Bin Mohd Azahari Shah**

- **Project Code:** BPJ241210141
- **Institution:** [Educational Institution]

---

## 📈 Future Enhancements

- [ ] Real payment gateway integration
- [ ] Email notifications
- [ ] SMS verification
- [ ] Multi-language support
- [ ] Recurring donations
- [ ] Advanced analytics

---

## 🙏 Acknowledgments

- Bootstrap team for the CSS framework
- Chart.js for data visualization
- jQuery team for the HTTP client library

---

## 📞 Support

For questions and support:
- Open an issue on GitHub
- Check the [documentation](documentation/) folder
- Review existing issues for similar problems

---

**Last Updated:** March 2026

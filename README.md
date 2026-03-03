# Micro-Donation Community Web Portal

A web portal for facilitating micro-donations (RM1-RM5) within local communities using QR Pay API integration.

---

## 📌 Project Overview

This is a full-stack web application that enables:

- **Users** to browse donation campaigns and contribute small amounts (RM1-RM5)
- **Admins** to create, manage, and monitor campaigns through a dashboard
- **Donors** to make payments via QR codes and receive digital receipts
- **Communities** to view transparent donation reports and statistics

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@communitygive.com` | (any password) |
| Test User | `testuser@example.com` | (any password) |

---

## 🛠️ Technologies Used

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5 |
| **Backend** | PHP (Vanilla) |
| **Database** | MySQL |
| **Payment** | Simulated QR Code Generation |
| **Libraries** | jQuery, Chart.js, DataTables, jsPDF |
| **Tools** | VS Code, XAMPP, phpMyAdmin, Postman |

---

## 📂 Project Structure

```
micro-donation-portal/
├── index.html                    # Homepage with featured campaigns
├── register.html                 # User registration page
├── donation-page.html            # Donation processing page
├── admin-dashboard.html          # Admin control panel
│
├── pages/                        # Additional pages
│   ├── campaigns.html            # Campaign listing
│   ├── transparency.html         # Public transparency & reports
│   ├── profile.html              # User profile
│   ├── about.html                # About page
│   └── contact.html              # Contact page
│
├── backend/                      # PHP Backend API
│   ├── config/
│   │   └── database.php          # MySQL database connection
│   ├── models/
│   │   └── User.php              # User model class
│   └── api/
│       ├── auth/                 # Authentication endpoints
│       │   ├── login.php
│       │   ├── register.php
│       │   └── logout.php
│       ├── campaigns/            # Campaign management
│       │   ├── get-all.php
│       │   ├── get-single.php
│       │   ├── create.php
│       │   ├── update.php
│       │   └── delete.php
│       ├── payment/              # Payment processing
│       │   ├── generate-qr.php
│       │   ├── save-donations.php
│       │   ├── verify.php
│       │   └── download-receipt.php
│       ├── user/                 # User management
│       │   ├── get-all.php
│       │   ├── get-single.php
│       │   ├── donations.php
│       │   └── delete.php
│       ├── donors/               # Donor information
│       │   └── get-all.php
│       └── transparency/         # Reports & stats
│           ├── report.php
│           └── stats.php
│
├── js/                           # JavaScript modules
│   ├── auth.js                   # Authentication logic
│   ├── campaigns.js              # Campaign listing & interactions
│   ├── payment.js                # Payment processing
│   ├── donation.js               # Donation flow
│   ├── transparency.js           # Transparency page logic
│   ├── campaign-modal.js         # Modal interactions
│   ├── homepage-campaigns.js     # Homepage campaigns
│   └── utils.js                  # Utility functions
│
├── css/                          # Stylesheets
│   ├── style.css                 # Main styles
│   ├── admin-style.css           # Admin dashboard styles
│   ├── responsive.css             # Responsive adjustments
│   ├── animations.css            # Animations
│   └── components/                # Component styles
│       ├── cards.css
│       ├── navbar.css
│       └── footer.css
│
├── assets/                       # Static assets
│   ├── images/                   # Images & logos
│   │   └── campaigns/            # Uploaded campaign images
│   └── qr-codes/                 # QR code assets
│
├── uploads/                      # User-uploaded files
│   └── campaigns/                # Campaign image uploads
│
└── package.json                  # Node.js dependencies
```

---

## 🗃️ Database Schema

### Users Table
```sql
users (id, email, password, name, role, avatar, total_donated, date_joined, status)
```

### Campaigns Table
```sql
campaigns (id, title, description, category, target_amount, current_amount, donors_count, 
           days_left, image_url, organizer, organizer_logo, featured, status, 
           start_date, end_date, created_by, created_at, updated_at)
```

### Donations Table
```sql
donations (id, user_id, campaign_id, amount, transaction_id, payment_method, 
           donor_name, donor_email, is_anonymous, status, qr_code_image, created_at)
```

### User Tokens Table
```sql
user_tokens (id, user_id, token, expires_at)
```

---

## 🚀 Getting Started

### Prerequisites
- XAMPP (or similar PHP + MySQL stack)
- Web browser
- VS Code (recommended)

### Installation

1. **Start Apache and MySQL** in XAMPP Control Panel

2. **Create the database**:
   ```sql
   CREATE DATABASE micro_donation_db;
   ```

3. **Import the database schema** (if available) or the system will create tables automatically

4. **Configure database credentials** in `backend/config/database.php`:
   ```php
   private $username = "root";    // Your MySQL username
   private $password = "";        // Your MySQL password
   ```

5. **Run the application**:
   - Place the project in `htdocs/micro-donation-portal/`
   - Open `http://localhost/micro-donation-portal/` in your browser

---

## 📱 Key Features

### For Visitors
- Browse active donation campaigns
- View campaign details and progress
- Access transparency reports

### For Registered Users
- User registration and login
- Make donations via QR code
- View donation history
- Download receipts

### For Administrators
- Create, edit, and delete campaigns
- Upload campaign images
- View all users and donors
- Analytics dashboard with charts
- Generate reports (PDF/Excel)

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login.php` | User login |
| POST | `/api/auth/register.php` | User registration |
| GET | `/api/campaigns/get-all.php` | List all campaigns |
| POST | `/api/campaigns/create.php` | Create campaign |
| POST | `/api/payment/generate-qr.php` | Generate donation QR |
| POST | `/api/payment/save-donations.php` | Save donation |
| GET | `/api/transparency/report.php` | Get transparency report |

---

## 📄 License

MIT License

---

## 👤 Author

**Khairil Aiman Bin Mohd Azahari Shah**
- Project: Micro-Donation Community Portal
- Institution: BPJ241210141

---

## 📊 System Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Visitor   │────▶│  Campaigns   │────▶│   Donate    │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Admin     │────▶│   Dashboard  │◀────│   Payment   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │                    │
       └───────────────────┴────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  MySQL DB │
                    └───────────┘
```

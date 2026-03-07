# Micro-Donation Community Web Portal - Project Context

## Project Overview

**CommunityGive** is a full-stack web application for facilitating micro-donations within local communities using QR payment integration. This is an educational student project (Code: BPJ241210141) by Khairil Aiman Bin Mohd Azahari Shah, designed for learning purposes and not intended for production use.

### Core Purpose
- Connect donors with local community campaigns
- Enable small-scale contributions starting from RM1
- Provide transparent donation tracking
- Simulate QR code payment processing for educational purposes

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **CSS Framework** | Bootstrap 5 |
| **Backend** | PHP (Vanilla) |
| **Database** | MySQL 5.7+ |
| **Charts** | Chart.js |
| **HTTP Client** | jQuery |
| **DataTables** | DataTables 1.13.4 (admin) |
| **Server** | Apache (XAMPP) |
| **PHP Version** | 8.0+ |

### Key Dependencies (package.json)
- `bootstrap`: ^5.3.0
- `chart.js`: ^4.3.0
- `jquery`: ^3.6.0
- `live-server`: ^1.2.2 (dev)

---

## Project Structure

```
micro-donation-portal/
├── index.html                    # Homepage with featured campaigns
├── register.html                 # User registration page
├── donation-page.html            # Donation flow with QR payment
├── admin-dashboard.html          # Admin panel with analytics
├── admin-script.js               # Admin dashboard JavaScript
├── admin-style.css               # Admin-specific styles
├── style.css                     # Main stylesheet
├── script.js                     # Universal JavaScript handlers
├── package.json                  # NPM configuration
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
│
├── backend/                      # PHP Backend
│   ├── config/
│   │   ├── database.php          # PDO Database connection class
│   │   └── env.php               # Environment variable loader
│   ├── api/
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── campaigns/            # Campaign CRUD endpoints
│   │   ├── donors/               # Donor management endpoints
│   │   ├── payment/              # Payment processing endpoints
│   │   ├── transparency/         # Public donation data endpoints
│   │   └── user/                 # User profile endpoints
│   ├── models/                   # Data models
│   └── .htaccess                 # Apache rewrite rules
│
├── js/                           # JavaScript Modules
│   ├── path-resolver.js          # Dynamic path resolution (CRITICAL)
│   ├── logger.js                 # Logging utility
│   ├── error-handler.js          # Global error handling
│   ├── sanitizer.js              # Input sanitization
│   ├── utils.js                  # General utilities
│   ├── auth.js                   # Authentication manager
│   ├── auth-global.js            # Global auth helpers
│   ├── campaigns.js              # Campaign data fetching
│   ├── homepage-campaigns.js     # Homepage campaign loader
│   ├── campaign-modal.js         # Campaign modal handlers
│   ├── donation.js               # Donation flow logic
│   ├── payment.js                # Payment processing
│   ├── transparency.js           # Transparency page logic
│   └── dom-handlers.js           # DOM manipulation utilities
│
├── pages/                        # Additional Pages
│   ├── campaigns.html            # Browse all campaigns
│   ├── about.html                # About page
│   ├── contact.html              # Contact page
│   ├── transparency.html         # Public donation transparency
│   └── profile.html              # User profile
│
├── css/                          # Additional stylesheets
├── assets/                       # Static assets (images, QR codes)
├── uploads/                      # User-generated content
└── documentation/                # Project documentation
    ├── QUICK_START.md            # Setup instructions
    ├── BASE_PATH_FIX.md          # Path resolution documentation
    ├── SECURITY_CHANGES_SUMMARY.md
    └── *.md                      # Various fix documentation
```

---

## Building and Running

### Prerequisites
- XAMPP (or equivalent PHP + MySQL stack)
- PHP 8.0+
- MySQL 5.7+
- Node.js (optional, for live-server)

### Setup Instructions

#### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# DB_HOST=localhost
# DB_NAME=micro_donation_db
# DB_USER=root
# DB_PASS=
# APP_ENV=development
```

#### 2. Database Setup
```sql
CREATE DATABASE micro_donation_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Import schema from `documentation/schema.sql` if available.

#### 3. Start Development Server

**Option A: XAMPP (Recommended)**
1. Place project in `xampp/htdocs/micro-donation-portal/`
2. Start Apache and MySQL from XAMPP Control Panel
3. Access: `http://localhost/micro-donation-portal/`

**Option B: NPM Live Server**
```bash
npm install
npm start
# Opens at http://localhost:3000
```

### Key URLs
| Page | URL |
|------|-----|
| Homepage | `http://localhost/micro-donation-portal/index.html` |
| Campaigns | `http://localhost/micro-donation-portal/pages/campaigns.html` |
| Donation | `http://localhost/micro-donation-portal/donation-page.html` |
| Register | `http://localhost/micro-donation-portal/register.html` |
| Admin | `http://localhost/micro-donation-portal/admin-dashboard.html` |
| Transparency | `http://localhost/micro-donation-portal/pages/transparency.html` |

---

## Development Conventions

### Path Resolution System
The project uses a **dynamic path resolution system** to handle navigation from different directory levels. This is critical for proper functionality.

**Script Loading Order (MUST be maintained):**
```html
<!-- In HTML <head> or before </body> -->
<script src="js/path-resolver.js"></script>    <!-- MUST BE FIRST -->
<script src="js/logger.js"></script>
<script src="js/error-handler.js"></script>
<script src="js/dom-handlers.js"></script>
<script src="js/sanitizer.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<!-- Other scripts -->
```

### Path Resolution API
```javascript
// Available globally after path-resolver.js loads
window.APP_BASE_PATH     // e.g., "/micro-donation-portal/"
window.API_BASE_URL      // e.g., "/micro-donation-portal/backend/api"
window.getRootPath()     // Function to get base path
window.getApiUrl(path)   // Function to build API URLs
```

### Coding Standards
- **PHP**: PSR-12 style guidelines
- **JavaScript**: ES6+ with modular architecture
- **CSS**: CSS custom properties (variables) for theming
- **HTML**: Semantic HTML5 with Bootstrap 5 classes

### Security Practices
- Password hashing with BCRYPT
- Prepared statements (PDO) to prevent SQL injection
- Input sanitization via `sanitizer.js`
- Token-based session management
- Role-based access control (admin/user)
- `.env` file for sensitive configuration (never committed)

### Testing Practices
- Manual testing via browser console (F12)
- Path resolver test page: `test-path-resolver.html`
- Check browser console for errors during development
- Verify API endpoints return proper JSON responses

---

## Key Features

### For Donors
- Browse active donation campaigns
- Quick donation via QR code payment (simulated)
- Anonymous donation option
- Digital receipt generation
- Donation history tracking
- User profile management

### For Administrators
- Campaign management (create, edit, delete)
- User and donor management
- Analytics dashboard with Chart.js visualizations
- Report generation
- Receipt verification system

### Payment Flow
1. User selects donation amount (preset tiers: Helper RM5, Supporter RM10, Champion RM25, Hero RM50)
2. QR code payment method (only option in demo)
3. Simulated payment processing (3-5 seconds)
4. Receipt generation and email notification

---

## Common Development Tasks

### Adding a New Page
1. Create HTML file in root or `pages/` directory
2. Include required scripts in correct order (see Path Resolution System)
3. Use relative paths for CSS/JS: `../style.css` if in `pages/`
4. Test from both root and nested URLs

### Creating API Endpoints
1. Create new PHP file in `backend/api/[category]/`
2. Include database config: `require_once dirname(__FILE__) . '/../../config/database.php';`
3. Use PDO prepared statements for all queries
4. Return JSON responses with `{ success: boolean, message: string, data: object }`

### Adding Campaign Data
Campaigns are loaded via API from `backend/api/campaigns/`. The frontend uses:
- `homepage-campaigns.js` for homepage featured campaigns
- `campaigns.js` for full campaign listing

### Styling Guidelines
- Use CSS custom properties from `style.css` root `:root`
- Primary gradient: `linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)`
- Success gradient: `linear-gradient(135deg, #10b981 0%, #34d399 100%)`
- Light theme with soothing colors (no dark mode implemented)

---

## Known Issues & Considerations

### Educational Project Limitations
- ⚠️ **Simulated Payments**: QR payment is not connected to real payment gateway
- ⚠️ **Email Disabled**: Receipt emails are simulated, not sent
- ⚠️ **No Production Security**: Missing rate limiting, CSRF protection, HTTPS enforcement

### Path Resolution
The project had significant path resolution issues that were fixed. Key files updated:
- `js/path-resolver.js` (new)
- `js/utils.js`
- `js/auth.js`
- All HTML files in `pages/` directory

If encountering 404 errors, verify:
1. `path-resolver.js` loads first
2. Base path is correctly detected: `window.APP_BASE_PATH`
3. Relative paths use `../` when in `pages/` directory

### Storage Keys
The project uses localStorage for session management:
- `micro_donation_token` - Auth token
- `micro_donation_user` - User data object

Legacy keys are automatically migrated but may cause conflicts during development.

---

## Documentation Files

| File | Description |
|------|-------------|
| `documentation/QUICK_START.md` | Setup and testing guide |
| `documentation/BASE_PATH_FIX.md` | Path resolution fix details |
| `documentation/SECURITY_CHANGES_SUMMARY.md` | Security implementation summary |
| `documentation/GITHUB_SECURITY_CHECKLIST.md` | Security checklist |
| `documentation/HIGH_PRIORITY_FIXES.md` | Known issues and fixes |
| `README.md` | Main project documentation |

---

## Quick Reference Commands

```bash
# Start live server (frontend only)
npm start

# Development mode with watch
npm run dev

# Check PHP syntax
php -l backend/config/database.php

# View Apache error log (XAMPP)
# Location: xampp/apache/logs/error.log
```

---

## Author & License

- **Author**: Khairil Aiman Bin Mohd Azahari Shah
- **Project Code**: BPJ241210141
- **License**: All Rights Reserved (Educational Project)
- **Status**: Development

---

*Last Updated: March 2026*

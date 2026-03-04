# Micro-Donation Community Web Portal - Project Context

## 📌 Project Overview

A full-stack web application for facilitating micro-donations (RM1-RM5) within local communities using QR Pay API integration. Built with vanilla PHP backend and modern JavaScript frontend.

**Purpose**: Enable users to browse donation campaigns, contribute small amounts via QR codes, and provide transparent tracking of donations.

**Demo Credentials**:
- Admin: `admin@communitygive.com` (any password)
- Test User: `testuser@example.com` (any password)

---

## 🏗️ Architecture

### Technology Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5 |
| **Backend** | PHP (Vanilla) |
| **Database** | MySQL |
| **Payment** | Simulated QR Code Generation |
| **Libraries** | jQuery, Chart.js, DataTables, jsPDF |

### Project Structure
```
micro-donation-portal/
├── index.html                    # Homepage
├── register.html                 # User registration
├── donation-page.html            # Donation processing
├── admin-dashboard.html          # Admin panel
├── pages/                        # Additional pages
│   ├── campaigns.html            # Campaign listing
│   ├── transparency.html         # Reports & stats
│   ├── profile.html              # User profile
│   ├── about.html                # About page
│   └── contact.html              # Contact page
├── backend/                      # PHP Backend API
│   ├── config/database.php       # MySQL connection
│   ├── models/User.php           # User model
│   └── api/                      # REST endpoints
│       ├── auth/                 # Login, register, logout
│       ├── campaigns/            # CRUD operations
│       ├── payment/              # QR generation, receipts
│       ├── user/                 # User management
│       ├── donors/               # Donor data
│       └── transparency/         # Reports & stats
├── js/                           # JavaScript modules
│   ├── path-resolver.js          # ⭐ Dynamic path resolution
│   ├── auth.js                   # Authentication (1148 lines)
│   ├── utils.js                  # Utilities (1186 lines)
│   ├── campaigns.js              # Campaign management
│   ├── donation.js               # Donation flow
│   └── ...
├── css/                          # Stylesheets
├── assets/                       # Images, QR codes
├── uploads/                      # User uploads
└── documentation/                # Technical docs
```

---

## 🚀 Setup & Running

### Prerequisites
- **XAMPP** (Apache + MySQL + PHP)
- Modern web browser (Chrome, Firefox, Edge)

### Installation Steps

1. **Start XAMPP Services**
   ```
   - Open XAMPP Control Panel
   - Start Apache
   - Start MySQL
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE micro_donation_db;
   ```

3. **Configure Database**
   - Edit `backend/config/database.php`
   - Update credentials if needed (default: root/empty password)

4. **Access Application**
   ```
   http://localhost/micro-donation-portal/
   ```

### Development Mode (Optional)
```bash
npm install
npm run dev    # Live reload on port 3000
```

---

## 🔧 Key Development Notes

### ⭐ Path Resolution System (CRITICAL)

The project uses a **dynamic path resolver** (`js/path-resolver.js`) to handle paths from different directory levels. This was implemented to fix 404 errors from hardcoded paths.

**Usage Pattern**:
```javascript
// In JavaScript files - ALWAYS use this pattern:
const rootPath = typeof getRootPath === 'function' ? getRootPath() : '';
window.location.href = `${rootPath}donation-page.html`;

// In HTML href attributes:
<a href="${typeof getRootPath === 'function' ? getRootPath() : ''}page.html">
```

**Script Loading Order** (MUST be followed):
```html
<!-- CORRECT ORDER -->
<script src="js/path-resolver.js"></script>  <!-- MUST LOAD FIRST -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap/..."></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
```

**From Root** (`/index.html`):
- `getRootPath()` returns `""`
- Paths: `donation-page.html`, `pages/campaigns.html`

**From Pages** (`/pages/campaigns.html`):
- `getRootPath()` returns `"../"`
- Paths: `../donation-page.html`, `../index.html`

### Authentication System

**Token-based auth** with localStorage + database storage:

```javascript
// Check authentication
const user = auth.getCurrentUser();  // Get current user
const isAuthenticated = auth.isAuthenticated();  // Check if logged in
const isAdmin = auth.isAdmin();  // Check admin role

// Login/Logout
await auth.handleLogin(email, password);
await auth.handleLogout(event);

// Storage keys
localStorage.getItem('micro_donation_user');
localStorage.getItem('micro_donation_token');
```

**API Base URL**: Set by path-resolver.js
```javascript
window.API_BASE_URL  // e.g., '/micro-donation-portal/backend/api'
window.APP_BASE_PATH // e.g., '/micro-donation-portal/'
```

### API Endpoint Pattern

All API calls follow this structure:
```
GET  /backend/api/campaigns/get-all.php
POST /backend/api/auth/login.php
POST /backend/api/payment/save-donations.php
```

**Example Fetch Call**:
```javascript
const response = await fetch(`${API_BASE_URL}/campaigns/get-all.php`);
const data = await response.json();
```

### Database Schema

**Key Tables**:
- `users` - User accounts (id, email, password, name, role, avatar, total_donated)
- `campaigns` - Donation campaigns (id, title, description, target_amount, current_amount)
- `donations` - Donation records (id, user_id, campaign_id, amount, transaction_id, status)
- `user_tokens` - Session tokens (id, user_id, token, expires_at)

---

## 📝 Development Conventions

### File Naming
- **HTML**: kebab-case (e.g., `donation-page.html`)
- **JavaScript**: kebab-case (e.g., `campaign-modal.js`)
- **PHP**: kebab-case (e.g., `download-receipt.php`)
- **CSS**: kebab-case (e.g., `admin-style.css`)

### JavaScript Patterns

**Class-based architecture**:
```javascript
class AuthManager { /* ... */ }
class Utils { /* ... */ }
class Database { /* PHP class */ }
```

**Global functions** (exposed by path-resolver.js):
- `getRootPath()` - Get relative path to root
- `resolvePath(path)` - Resolve relative to absolute path

**Event Handling**:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
});
```

### CSS Organization

```
css/
├── style.css           # Main styles (CSS variables, components)
├── admin-style.css     # Admin dashboard specific
├── responsive.css      # Media queries
├── animations.css      # Keyframe animations
└── components/         # Component-specific styles
    ├── cards.css
    ├── navbar.css
    └── footer.css
```

**CSS Variables** (defined in `:root`):
```css
--primary-color: #4f46e5;
--success-color: #10b981;
--bg-primary: #f8fafc;
--shadow-md: 0 5px 20px rgba(15, 23, 42, 0.08);
```

---

## 🧪 Testing

### Manual Testing Checklist

1. **Path Resolution**
   - [ ] Test from root: `http://localhost/micro-donation-portal/`
   - [ ] Test from pages: `http://localhost/micro-donation-portal/pages/campaigns.html`
   - [ ] Use test pages: `/test-path-resolver.html` and `/pages/test-path-resolver.html`

2. **Authentication Flow**
   - [ ] Login with demo credentials
   - [ ] Logout from any page (should not 404)
   - [ ] Admin redirect works

3. **Donation Flow**
   - [ ] Click "Donate" from homepage
   - [ ] Click "Donate" from campaigns page
   - [ ] Complete donation process
   - [ ] View receipt from transparency page

4. **Admin Features**
   - [ ] Access admin dashboard
   - [ ] Create/edit campaigns
   - [ ] View analytics

### Console Verification
```javascript
// Run in browser console to verify path resolution
console.log('Base Path:', window.APP_BASE_PATH);
console.log('API URL:', window.API_BASE_URL);
console.log('Root Path:', getRootPath());
```

---

## 🐛 Common Issues & Solutions

### Issue: 404 Errors on Navigation
**Cause**: Hardcoded paths without using `getRootPath()`  
**Solution**: Use dynamic path resolution pattern
```javascript
// ❌ WRONG
window.location.href = 'donation-page.html';

// ✅ CORRECT
const rootPath = typeof getRootPath === 'function' ? getRootPath() : '';
window.location.href = `${rootPath}donation-page.html`;
```

### Issue: CSS Not Loading
**Cause**: Incorrect relative paths in `<link>` tags  
**Solution**: 
- Root files: `href="style.css"`
- Pages files: `href="../style.css"`

### Issue: API Calls Failing
**Cause**: `API_BASE_URL` not set or incorrect  
**Solution**: Ensure `path-resolver.js` loads before other scripts

### Issue: Logout Redirects to 404
**Cause**: Hardcoded `'index.html'` from `/pages/` directory  
**Solution**: Use `getRootPath() + 'index.html'`

---

## 📚 Documentation Reference

Detailed fix documentation available in `documentation/`:

| Document | Description |
|----------|-------------|
| `QUICK_START.md` | Testing & verification guide |
| `BASE_PATH_FIX.md` | Path resolution implementation |
| `LOGOUT_FIX.md` | Logout redirect fixes |
| `RECEIPT_FIX.md` | Receipt download fixes |
| `PATH_FIXES_COMPLETE.md` | Comprehensive path fixes |
| `VERIFICATION_REPORT.md` | Complete verification report |

---

## 🔐 Security Notes

- **Passwords**: Should be hashed with `password_hash()` in PHP
- **Tokens**: Stored in database (`user_tokens`) + localStorage
- **CORS**: Configured in PHP backend (`Access-Control-Allow-Origin: *`)
- **Session**: PHP sessions + token-based authentication
- **Demo Mode**: Test credentials bypass password verification (for development only)

---

## 📦 Dependencies

### NPM (Development)
```json
{
  "devDependencies": {
    "live-server": "^1.2.2"
  },
  "dependencies": {
    "bootstrap": "^5.3.0",
    "chart.js": "^4.3.0",
    "jquery": "^3.6.0"
  }
}
```

### CDN (Production)
- Bootstrap 5.3.0 (CSS + JS)
- Font Awesome 6.4.0
- Chart.js 3.9.1
- DataTables 1.13.4
- jsPDF 2.5.1

---

## 🎯 Key Files for AI Context

| File | Purpose | Lines |
|------|---------|-------|
| `js/path-resolver.js` | ⭐ Path resolution core | 162 |
| `js/auth.js` | Authentication logic | 1148 |
| `js/utils.js` | Utility functions | 1186 |
| `js/donation.js` | Donation flow | 1236 |
| `backend/config/database.php` | Database connection | - |
| `backend/api/auth/login.php` | Login endpoint | - |
| `backend/api/payment/download-receipt.php` | Receipt generation | - |

---

**Last Updated**: 5 March 2026  
**Project Status**: ✅ Production Ready (All path issues resolved)  
**Total Codebase**: ~15,000+ lines across HTML, CSS, JavaScript, and PHP

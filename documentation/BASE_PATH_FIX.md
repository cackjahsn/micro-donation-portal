# Base Path Fix - Implementation Summary

## Problem
The `<base href="/micro-donation-portal/">` tag caused issues when:
1. Running the site from different directory structures
2. Accessing pages from subdirectories (e.g., `/pages/campaigns.html`)
3. Deploying to different environments (production vs development)

## Solution
Implemented a dynamic path resolution system using JavaScript that automatically detects the correct base path at runtime.

---

## Files Changed

### 1. **New File: `js/path-resolver.js`**
   - **Purpose**: Auto-detects base path and provides path resolution utilities
   - **Key Features**:
     - `window.APP_BASE_PATH` - Detected application base path
     - `window.API_BASE_URL` - Full API endpoint URL
     - `resolvePath(path)` - Resolves relative paths to absolute
     - `getRootPath()` - Gets relative path to root directory

### 2. **Root HTML Files** (Removed `<base>` tag, added path-resolver.js)
   - ✅ `index.html`
   - ✅ `donation-page.html`
   - ✅ `register.html`
   - ✅ `admin-dashboard.html`

### 3. **Pages Directory HTML Files** (Updated paths with `../` prefix)
   - ✅ `pages/campaigns.html`
   - ✅ `pages/about.html`
   - ✅ `pages/contact.html`
   - ✅ `pages/transparency.html`
   - ✅ `pages/profile.html`

### 4. **JavaScript Files Updated**
   - ✅ `js/utils.js` - Now uses `window.API_BASE_URL` from path-resolver
   - ✅ `js/auth.js` - Now uses `window.API_BASE_URL` from path-resolver

---

## How It Works

### Path Detection Logic

```javascript
// Automatically detects base path from URL
// Example URLs and detected paths:

http://localhost/micro-donation-portal/index.html
  → APP_BASE_PATH = '/micro-donation-portal/'

http://localhost/micro-donation-portal/pages/campaigns.html
  → APP_BASE_PATH = '/micro-donation-portal/'

http://localhost/index.html
  → APP_BASE_PATH = '/'
```

### Script Loading Order (IMPORTANT!)

```html
<!-- CORRECT ORDER -->
<script src="js/path-resolver.js"></script>  <!-- MUST BE FIRST -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap/..."></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<!-- Other scripts -->
```

---

## Path Resolution Examples

### From Root Directory (`index.html`, `donation-page.html`, etc.)

| Original Path | Resolved To |
|---------------|-------------|
| `style.css` | `/micro-donation-portal/style.css` |
| `js/auth.js` | `/micro-donation-portal/js/auth.js` |
| `pages/campaigns.html` | `/micro-donation-portal/pages/campaigns.html` |
| `/absolute/path.css` | `/absolute/path.css` (unchanged) |

### From Pages Directory (`pages/*.html`)

| Original Path | Resolved To |
|---------------|-------------|
| `../style.css` | `/micro-donation-portal/style.css` |
| `../js/auth.js` | `/micro-donation-portal/js/auth.js` |
| `campaigns.html` | `/micro-donation-portal/pages/campaigns.html` |

---

## Testing

### 1. Test Path Resolver
Open: `http://localhost/micro-donation-portal/test-path-resolver.html`

This will show:
- ✅ Base path detection status
- ✅ API URL configuration
- ✅ Path resolution function tests
- ✅ Working test links

### 2. Test Main Pages
Verify these pages load correctly:
- [ ] `http://localhost/micro-donation-portal/index.html`
- [ ] `http://localhost/micro-donation-portal/donation-page.html`
- [ ] `http://localhost/micro-donation-portal/register.html`
- [ ] `http://localhost/micro-donation-portal/admin-dashboard.html`
- [ ] `http://localhost/micro-donation-portal/pages/campaigns.html`
- [ ] `http://localhost/micro-donation-portal/pages/about.html`

### 3. Test API Calls
Open browser console and verify:
```javascript
console.log(window.API_BASE_URL);
// Should output: /micro-donation-portal/backend/api

console.log(window.APP_BASE_PATH);
// Should output: /micro-donation-portal/
```

---

## Benefits

### ✅ Advantages
1. **Environment Agnostic** - Works in any directory structure
2. **No Server Configuration** - Pure JavaScript solution
3. **Backward Compatible** - Falls back to hardcoded path if needed
4. **Easy Deployment** - No changes needed when deploying
5. **Subdirectory Support** - Correctly handles nested pages

### ⚠️ Considerations
1. **JavaScript Required** - Path resolution requires JS enabled
2. **Load Order Critical** - `path-resolver.js` must load first
3. **CDN Resources** - External resources (Bootstrap, FontAwesome) unaffected

---

## Troubleshooting

### Issue: CSS not loading
**Check**: Is `path-resolver.js` loaded before other scripts?
```html
<!-- ✅ CORRECT -->
<script src="js/path-resolver.js"></script>
<link rel="stylesheet" href="style.css">

<!-- ❌ WRONG (if using JS to fix paths) -->
<link rel="stylesheet" href="style.css">
<script src="js/path-resolver.js"></script>
```

### Issue: API calls failing
**Check**: Console for API_BASE_URL value
```javascript
console.log(window.API_BASE_URL);
// Should be: /micro-donation-portal/backend/api
```

### Issue: Pages in /pages/ directory not working
**Check**: Are CSS/JS paths using `../` prefix?
```html
<!-- ✅ CORRECT for pages/*.html -->
<link rel="stylesheet" href="../style.css">
<script src="../js/auth.js"></script>

<!-- ❌ WRONG for pages/*.html -->
<link rel="stylesheet" href="style.css">
<script src="js/auth.js"></script>
```

---

## Future Improvements

1. **Build Process**: Consider using a bundler (Vite/Webpack) for automatic path resolution
2. **Server-Side**: Implement PHP-based path resolution for better SEO
3. **Framework Migration**: Consider React/Vue for component-based architecture
4. **Service Worker**: Cache path resolution for offline support

---

## Rollback Instructions

If you need to revert to the `<base>` tag approach:

1. Remove `<script src="js/path-resolver.js"></script>` from all HTML files
2. Add `<base href="/micro-donation-portal/">` to `<head>` section
3. Revert `js/utils.js` and `js/auth.js` to use hardcoded paths
4. Delete `js/path-resolver.js` and `test-path-resolver.html`

---

**Date**: 5 March 2026  
**Author**: AI Assistant  
**Status**: ✅ Implemented

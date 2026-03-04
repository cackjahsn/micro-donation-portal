# Receipt 404 Error - Fix Summary

## Problem
When clicking "View Receipt" on the transparency page (`pages/transparency.html`), users got a 404 error.

---

## Root Cause
The JavaScript file `js/transparency.js` was generating receipt links with relative paths:
```javascript
// BROKEN - from /pages/ directory
`backend/api/payment/download-receipt.php?donation_id=${d.id}`

// This resolves to:
// /pages/backend/api/payment/download-receipt.php ❌ 404
```

The backend PHP file exists at:
```
/backend/api/payment/download-receipt.php ✅
```

But from `/pages/transparency.html`, the relative path needs to go up one directory first.

---

## Solution
Updated `js/transparency.js` to use correct relative paths:

```javascript
// FIXED - from /pages/ directory
`../backend/api/payment/download-receipt.php?donation_id=${d.id}`

// This resolves to:
// /backend/api/payment/download-receipt.php ✅ Works!
```

---

## Files Modified

### 1. **js/transparency.js**

**Line 100** - Browse campaigns link:
```javascript
// OLD
<a href="pages/campaigns.html" class="btn btn-primary btn-sm">

// NEW
<a href="../pages/campaigns.html" class="btn btn-primary btn-sm">
```

**Lines 117 & 119** - Receipt view links:
```javascript
// OLD
<a href="backend/api/payment/download-receipt.php?donation_id=${d.id}&token=${token}">
<a href="backend/api/payment/download-receipt.php?donation_id=${d.id}">

// NEW
<a href="../backend/api/payment/download-receipt.php?donation_id=${d.id}&token=${token}">
<a href="../backend/api/payment/download-receipt.php?donation_id=${d.id}">
```

---

## How to Test

### Prerequisites
1. ✅ Login to your account
2. ✅ Have at least one completed donation

### Test Steps

1. **Navigate to Transparency Page**
   ```
   http://localhost/micro-donation-portal/pages/transparency.html
   ```

2. **Scroll to "Recent Transactions" table**
   - You should see your donation history

3. **Click "View" in the Receipt column**
   - A new tab should open
   - The receipt should display correctly
   - URL should be: `/micro-donation-portal/backend/api/payment/download-receipt.php?donation_id=X&token=...`

4. **Verify Receipt Content**
   - ✅ Receipt displays with donation details
   - ✅ Amount, campaign name, donor name are correct
   - ✅ Print button works
   - ✅ Download PDF button works
   - ✅ Close button works

---

## Backend File Structure

The receipt PHP file is located at:
```
backend/
└── api/
    └── payment/
        ├── download-receipt.php ← This file handles receipt display
        ├── generate-receipt.php
        ├── generate-qr.php
        ├── save-donations.php
        └── verify.php
```

### What `download-receipt.php` Does:

1. **Authentication** - Validates user token/session
2. **Permission Check** - Ensures user can view this receipt
3. **Data Retrieval** - Fetches donation details from database
4. **Receipt Generation** - Creates HTML/PDF receipt
5. **Display** - Shows receipt with print/download options

---

## Path Resolution Examples

### From Root Directory (`/index.html`)
| Destination | Path | Works? |
|-------------|------|--------|
| Backend API | `backend/api/...` | ✅ Yes |
| Pages | `pages/...` | ✅ Yes |
| CSS | `style.css` | ✅ Yes |

### From Pages Directory (`/pages/transparency.html`)
| Destination | Path | Works? |
|-------------|------|--------|
| Backend API | `../backend/api/...` | ✅ Yes |
| Other Pages | `../pages/...` or `./...` | ✅ Yes |
| CSS | `../style.css` | ✅ Yes |
| Backend API | `backend/api/...` | ❌ NO (404) |

---

## Related Issues Fixed

This fix also resolved:
- ✅ "Browse Campaigns" link in empty donations table
- ✅ Consistent path structure across all transparency page links

---

## Additional Notes

### Token Authentication
The receipt link includes a token parameter for authentication:
```
download-receipt.php?donation_id=123&token=token_abc123...
```

This token is:
- Retrieved from localStorage
- URL-encoded for safety
- Validated by the PHP backend
- Required to view the receipt (prevents unauthorized access)

### Backend Authentication Flow
1. User clicks "View Receipt"
2. JavaScript gets token from localStorage
3. Token is appended to receipt URL
4. PHP validates token against `user_tokens` table
5. If valid, receipt is displayed
6. If invalid/expired, 401 error is shown

---

## Error Scenarios

### 404 Not Found
**Cause**: Wrong path to backend file  
**Fix**: Use `../backend/...` from pages directory ✅

### 401 Unauthorized
**Cause**: Invalid or missing token  
**Fix**: Login again to get fresh token

### 404 Donation Not Found
**Cause**: Donation ID doesn't exist or user doesn't have permission  
**Fix**: Ensure you're viewing your own donations

---

## Testing Checklist

- [ ] Login to user account
- [ ] Navigate to transparency page
- [ ] View receipt for a completed donation
- [ ] Verify receipt displays correctly
- [ ] Test print functionality
- [ ] Test download PDF
- [ ] Test from different browsers
- [ ] Test logout and login again
- [ ] Test from admin account (if available)

---

**Date**: 5 March 2026  
**Status**: ✅ Fixed  
**Tested**: Ready for testing

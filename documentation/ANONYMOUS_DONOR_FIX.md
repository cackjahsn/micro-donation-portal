# Anonymous Donor Mismatch Bug Fix

## Problem

After fixing the double-counting bug, there was still a mismatch:

- **Donors list shows**: RM 1,006
- **Donor details modal shows**: RM 1,009

**Difference**: RM 3 (one anonymous donation)

### Root Cause

The backend was **excluding anonymous donors** from the donors list, but the frontend modal was **including all donations** by email.

**Backend Query (BEFORE)**:
```sql
WHERE donor_email IS NOT NULL
    AND donor_email != ''
    AND donor_name != 'Anonymous'  -- ❌ EXCLUDED anonymous donations
    AND status = 'completed'
```

**Frontend Filter (ALWAYS)**:
```javascript
// Always filtered by email only, never excluded anonymous
const donorDonations = donationsData.donations.filter(d =>
    d.donor_email && d.donor_email.toLowerCase() === email.toLowerCase()
);
```

### Why This Happened

When a user donates anonymously:
1. They enter their real email (for receipt)
2. They check "Make this donation anonymous"
3. Database stores: `donor_email = 'iman@gmail.com'`, `donor_name = 'Anonymous'`, `is_anonymous = 1`

The backend was excluding these donations from the donors list because `donor_name = 'Anonymous'`.

---

## Solution

**Remove the anonymous donor exclusion** from the backend. Admin should see ALL donations, including anonymous ones made by registered users.

### Backend Fix: `backend/api/donors/get-all.php`

**Line 18-40** (Main donors query):
```sql
-- BEFORE (WRONG)
WHERE donor_email IS NOT NULL
    AND donor_email != ''
    AND donor_name != 'Anonymous'  -- ❌ Removed this line
    AND status = 'completed'

-- AFTER (CORRECT)
WHERE donor_email IS NOT NULL
    AND donor_email != ''
    AND status = 'completed'  -- ✓ Only filter by email and status
```

**Line 64-74** (Statistics query):
```sql
-- BEFORE (WRONG)
FROM donations
WHERE donor_email IS NOT NULL
    AND donor_email != ''
    AND donor_name != 'Anonymous'  -- ❌ Removed this line
    AND status = 'completed'

-- AFTER (CORRECT)
FROM donations
WHERE donor_email IS NOT NULL
    AND donor_email != ''
    AND status = 'completed'  -- ✓ Only filter by email and status
```

---

## Files Modified

### `backend/api/donors/get-all.php`

**Change 1 - Line 18-40**: Removed `AND donor_name != 'Anonymous'` from main query

**Change 2 - Line 64-74**: Removed `AND donor_name != 'Anonymous'` from statistics query

---

## Verification

### Before Fix
```
User: iman@gmail.com

Donations in database:
- RM 5 (named)      ✓ counted
- RM 1 (named)      ✓ counted
- RM 3 (anonymous)  ✗ EXCLUDED

Donors List:    RM 6
Donor Details:  RM 9  (includes anonymous)
Mismatch:       RM 3
```

### After Fix
```
User: iman@gmail.com

Donations in database:
- RM 5 (named)      ✓ counted
- RM 1 (named)      ✓ counted
- RM 3 (anonymous)  ✓ NOW COUNTED

Donors List:    RM 9
Donor Details:  RM 9  (matches!)
Mismatch:       RM 0 ✓
```

---

## Important Design Decision

### Should Admin See Anonymous Donations?

**YES!** Here's why:

1. **Anonymous is for public display only**
   - Anonymous flag hides donor name from PUBLIC view
   - Admin should still see who donated for transparency

2. **Email is still provided**
   - Anonymous donors still provide email for receipts
   - Admin can identify donors by email

3. **Audit trail**
   - Admin needs complete donation history
   - Excluding anonymous creates gaps in records

4. **Prevents confusion**
   - Mismatched totals confuse admins
   - Complete data is better for decision-making

### What About True Anonymity?

If a donor wants COMPLETE anonymity:
- They should use a disposable email
- Or donate without providing email (if system allows)
- Or use cash/offline donation methods

The `is_anonymous` flag is for **public display**, not admin visibility.

---

## Database Schema Note

Your database has these relevant fields:

```sql
CREATE TABLE donations (
    ...
    donor_name VARCHAR(100),      -- Can be 'Anonymous' or real name
    donor_email VARCHAR(100),     -- Always real email (for receipts)
    is_anonymous TINYINT(1),      -- 1 = hide from public, 0 = show
    ...
);
```

**Important**: `donor_name = 'Anonymous'` and `is_anonymous = 1` are related but different:
- `donor_name`: What to display (can be 'Anonymous' or real name)
- `is_anonymous`: Whether to hide from public lists

For admin purposes, we only care about `donor_email` for identification.

---

## Testing

### Test Steps

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Login** to admin dashboard
3. **Navigate** to Donors section
4. **Find** a donor who made anonymous donations (e.g., iman@gmail.com)
5. **Note** the total in the donors list
6. **Click** eye icon to view details
7. **Verify** the totals match exactly

### Verify Anonymous Donations Are Included

Run this SQL query:
```sql
SELECT 
    donor_email,
    donor_name,
    is_anonymous,
    amount,
    status
FROM donations
WHERE donor_email = 'iman@gmail.com'
    AND status = 'completed'
ORDER BY created_at DESC;
```

You should see all donations, including those with `donor_name = 'Anonymous'` or `is_anonymous = 1`.

---

## Related Fixes

This fix completes the donor details accuracy improvements:

1. ✅ **Fix 1**: Only count completed donations (not pending)
2. ✅ **Fix 2**: Include anonymous donations in donors list
3. ✅ **Fix 3**: Statistics page uses completed donations only

All three fixes work together to ensure accurate donor data.

---

**Date Fixed:** March 8, 2026  
**Fixed By:** Khairil Aiman Bin Mohd Azahari Shah  
**Issue Reported By:** User testing anonymous donations  
**Status:** ✅ Resolved

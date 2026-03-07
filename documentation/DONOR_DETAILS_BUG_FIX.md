# Donor Details Double Amount Bug Fix

## Problem

When viewing donor details in the admin dashboard by clicking the "View Donor Details" button (eye icon), the total donation amount was showing **double** the actual amount.

**Example:**
- Donor list shows: RM 1,006 (correct)
- Donor details modal shows: RM 2,024 (incorrect - approximately double)

### Additional Issue Found

The statistics page was also counting all donations (including pending), showing inflated numbers.

---

## Root Cause

The bug was in two functions in `admin-script.js`:

### 1. `viewDonor()` Function (Line 2863-2933)

The function was fetching ALL donations and filtering only by email address, but **not filtering by donation status**:

```javascript
// BEFORE (BUGGY CODE)
const donorDonations = donationsData.donations.filter(d =>
    d.donor_email && d.donor_email.toLowerCase() === email.toLowerCase()
);
```

### 2. `loadStatisticsData()` Function (Line 3910-3946)

The statistics page was counting all donations without filtering by status:

```javascript
// BEFORE (BUGGY CODE)
if (donationsData.success && Array.isArray(donationsData.donations)) {
    totalDonations = donationsData.donations.length;
    totalDonationAmount = donationsData.donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
}
```

### Why This Caused Double Counting

In the database, each donation creates **two records**:
1. One with `status = 'pending'` (initial donation creation)
2. One with `status = 'completed'` (after payment is confirmed)

**Example from database:**
```sql
-- Same donation, two entries
INSERT INTO donations VALUES
(81, 11, 5, 3.00, 'qr', 'DON-...', 'pending', ...),
(84, 11, 5, 3.00, 'qr', 'DON-...', 'completed', ...);
```

When calculating the total, the code was summing **both** the pending and completed donations, effectively doubling the amount.

---

## Solution

### Fix 1: Donor Details Modal

Added a status filter to only include **completed** donations in `viewDonor()`:

```javascript
// AFTER (FIXED CODE)
const donorDonations = donationsData.donations.filter(d =>
    d.donor_email && 
    d.donor_email.toLowerCase() === email.toLowerCase() &&
    d.status === 'completed'  // FIXED: Only include completed donations
);
```

### Fix 2: Statistics Page

Added filtering to only count **completed** donations in `loadStatisticsData()`:

```javascript
// AFTER (FIXED CODE)
if (donationsData.success && Array.isArray(donationsData.donations)) {
    const completedDonations = donationsData.donations.filter(d => d.status === 'completed');
    totalDonations = completedDonations.length;
    totalDonationAmount = completedDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
}
```

---

## Files Modified

### `admin-script.js`

**Fix 1 - Line:** 2882-2886 (viewDonor function)

**Fix 2 - Line:** 3910-3946 (loadStatisticsData function)

---

## Verification

### Before Fix
```
Donor: iman@gmail.com
Donations List: RM 1,006 ✓
Donor Details Modal: RM 2,024 ✗ (WRONG - includes pending donations)
```

### After Fix
```
Donor: iman@gmail.com
Donations List: RM 1,006 ✓
Donor Details Modal: RM 1,006 ✓ (CORRECT - only completed donations)
```

---

## Related Code

### Backend (Already Correct)

The backend API `backend/api/donors/get-all.php` was already correctly filtering by status:

```php
SELECT
    donor_email as email,
    MAX(donor_name) as name,
    SUM(amount) as total_donations,  -- Only sums completed donations
    ...
FROM donations
WHERE donor_email IS NOT NULL
    AND donor_email != ''
    AND donor_name != 'Anonymous'
    AND status = 'completed'  -- ✓ Correctly filtered
GROUP BY donor_email
```

This is why the donors list showed the correct amount, but the modal (which calculated client-side) was wrong.

---

## Testing

### Test Steps

1. **Login** to admin dashboard
2. **Navigate** to Donors section
3. **Note** the total donation amount shown in the list
4. **Click** the eye icon (View Donor Details) for any donor
5. **Verify** the total in the modal matches the list

### Expected Result

Both amounts should be identical and only include completed donations.

---

## Additional Notes

### Why Pending Donations Exist

The duplicate pending/completed entries are created by the payment flow:

1. User initiates donation → Creates `pending` record
2. User completes QR payment → Updates to `completed` (or creates new `completed` record)

This is a common pattern in payment systems to track the payment lifecycle.

### Alternative Solutions Considered

1. **Fix in Backend**: Could add a new API endpoint for donor details
   - ❌ Requires backend changes
   - ❌ More complex deployment

2. **Filter by Transaction ID**: Could deduplicate by transaction_id
   - ❌ Some transactions might have null IDs
   - ❌ More complex logic

3. **Filter by Status** (Chosen Solution)
   - ✅ Simple one-line fix
   - ✅ Clear intent (only count completed)
   - ✅ No backend changes needed

---

## Prevention

To prevent similar issues in the future:

1. **Always filter by status** when calculating donation totals
2. **Document** the pending/completed dual-record pattern
3. **Add validation** to ensure totals match between list and detail views
4. **Consider** adding unit tests for donation calculations

---

## Additional Testing

### Test Statistics Page

1. **Navigate** to Statistics page from admin dashboard
2. **Check** "Total Donations" count
3. **Verify** it only counts completed donations
4. **Check** "Average Donation" amount
5. **Verify** calculation uses only completed donations

### Verify Database

Run this SQL to see the pending vs completed pattern:

```sql
SELECT id, user_id, donor_email, amount, status, created_at
FROM donations
WHERE donor_email = 'iman@gmail.com'
ORDER BY created_at DESC;
```

You should see both pending and completed entries for each donation.

---

**Date Fixed:** March 8, 2026  
**Fixed By:** Khairil Aiman Bin Mohd Azahari Shah  
**Bug Reported By:** User testing admin dashboard  
**Status:** ✅ Resolved

---

## Related Fix: Anonymous Donor Mismatch

After this fix, another issue was found: anonymous donations were excluded from the donors list but included in the details modal.

**See**: `ANONYMOUS_DONOR_FIX.md` for details on fixing the backend to include anonymous donations.

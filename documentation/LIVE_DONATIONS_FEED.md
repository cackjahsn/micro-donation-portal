# Live Donations Feed - Database Integration

## Summary

Updated the donation page's "Live Donations" feature to display **real donation data** from the database instead of using dummy/simulated data.

---

## Changes Made

### 1. New API Endpoint Created

**File:** `backend/api/donations/get-recent.php`

**Purpose:** Fetch recent completed donations from the database

**Features:**
- Returns donations with `status = 'completed'`
- Supports filtering by campaign ID
- Calculates human-readable "time ago" format
- Respects anonymous donor preferences
- Returns formatted donor names (fallback to "A Donor" if needed)

**Query Parameters:**
- `limit` (optional): Number of donations to return (default: 8)
- `campaign_id` (optional): Filter by specific campaign

**Example Request:**
```
GET /backend/api/donations/get-recent.php?limit=8&campaign_id=5
```

**Example Response:**
```json
{
  "success": true,
  "donations": [
    {
      "id": 84,
      "amount": 3.00,
      "donor_name": "Anonymous",
      "is_anonymous": true,
      "campaign_id": 5,
      "campaign_title": "shaqel patah tangan sakit",
      "payment_date": "2026-03-05 14:40:44",
      "time_ago": "2 hours ago",
      "initial": "A"
    }
  ],
  "count": 1
}
```

---

### 2. Updated JavaScript (donation.js)

**Modified Methods:**

#### `initLiveDonationsFeed()`
**Before:** Started a setInterval with simulated donations
**After:** Calls `loadRealDonations()` immediately and refreshes every 10 seconds

#### `loadRealDonations()` (NEW)
- Fetches real donations from the API
- Filters by current campaign if available
- Clears existing dummy data
- Calls `addDonationToFeed()` for each real donation
- Shows placeholder if no donations exist

#### `addDonationToFeed(donation)` (NEW)
- Creates formatted donation item
- Displays donor name, amount, and time ago
- Uses gradient avatar with donor initial
- Maintains 8-item limit

**Removed:**
- `addRandomDonation()` - No longer needed (was generating fake data)

---

### 3. Test Page Created

**File:** `test-donations-api.html`

**Purpose:** Test the API endpoint independently

**Features:**
- Load all recent donations
- Filter by specific campaigns (#5, #7)
- View raw JSON response
- Preview formatted donation feed

**URL:**
```
http://localhost/micro-donation-portal/test-donations-api.html
```

---

### 4. Documentation Updated

**File:** `QWEN.md`

**Added:**
- `donations/` API directory structure
- Live Donations Feed section with API documentation
- Response format example
- Testing instructions
- Troubleshooting guide

---

## Database Schema Used

The API queries the `donations` table:

```sql
SELECT 
    d.id,
    d.amount,
    d.payment_date,
    d.donor_name,
    d.donor_email,
    d.is_anonymous,
    d.campaign_id,
    c.title as campaign_title,
    u.name as user_name
FROM donations d
LEFT JOIN campaigns c ON d.campaign_id = c.id
LEFT JOIN users u ON d.user_id = u.id
WHERE d.status = 'completed'
ORDER BY d.payment_date DESC
LIMIT 8
```

**Key Fields:**
- `status`: Must be `'completed'` to appear in feed
- `is_anonymous`: If `1`, shows as "Anonymous"
- `donor_name`: Preferred name if provided
- `user_name`: Fallback name from users table
- `payment_date`: Used for "time ago" calculation

---

## Testing Instructions

### Step 1: Verify Database Has Completed Donations

Run this SQL query:
```sql
SELECT id, amount, donor_name, is_anonymous, status, payment_date
FROM donations
WHERE status = 'completed'
ORDER BY payment_date DESC
LIMIT 5;
```

**Expected:** At least one row with `status = 'completed'`

### Step 2: Test API Endpoint

**URL:**
```
http://localhost/micro-donation-portal/backend/api/donations/get-recent.php?limit=8
```

**Expected:** JSON response with donation data

### Step 3: Test Donation Page

1. Open: `http://localhost/micro-donation-portal/donation-page.html?id=5`
2. Look at the "Live Donations" sidebar
3. Verify real donations appear (not random names)

### Step 4: Check Console Logs

Open browser console (F12) and look for:
```
Loaded X real donations from database
```

---

## Features

### What's Displayed

| Field | Source | Format |
|-------|--------|--------|
| Donor Name | `donor_name` or `user_name` | Truncated to first initial if anonymous |
| Amount | `amount` | `RM X.XX` (2 decimal places) |
| Time Ago | `payment_date` | "just now", "5 min ago", "2 hours ago", etc. |
| Avatar | Generated | First letter of donor name |

### Anonymous Donors

If `is_anonymous = 1`:
- Display name: **"Anonymous"**
- Avatar initial: **"A"**

### Time Formatting

- < 1 minute: "just now"
- < 1 hour: "X min ago"
- < 24 hours: "X hour(s) ago"
- < 7 days: "X day(s) ago"
- Older: "M j" format (e.g., "Mar 5")

---

## Troubleshooting

### Issue: "Loading live donations..." never completes

**Possible Causes:**
1. No completed donations in database
2. Database connection error
3. API endpoint returns error

**Solution:**
1. Check browser console (F12) for errors
2. Test API endpoint directly in browser
3. Verify `.env` database credentials

### Issue: Shows wrong campaign donations

**Solution:**
- The feed automatically filters by the current campaign
- Check URL parameter: `donation-page.html?id=5`
- Verify `campaignInfo.id` is set correctly

### Issue: Anonymous donors showing real names

**Solution:**
- Check `is_anonymous` field in database
- Should be `1` for anonymous, `0` for named

---

## Files Modified

| File | Type | Changes |
|------|------|---------|
| `backend/api/donations/get-recent.php` | NEW | API endpoint for fetching donations |
| `js/donation.js` | MODIFIED | Replaced simulated feed with real API calls |
| `test-donations-api.html` | NEW | Test page for API verification |
| `QWEN.md` | MODIFIED | Added documentation for donations API |

---

## Future Enhancements

Potential improvements:

1. **WebSocket Integration**: Real-time updates without polling
2. **Donation Animations**: Slide-in effects for new donations
3. **Sound Notifications**: Optional chime for new donations
4. **Filter Options**: Show only large donations, etc.
5. **Pagination**: Load more button for older donations
6. **Export**: Download donation history as CSV

---

**Created:** March 7, 2026  
**Author:** Khairil Aiman Bin Mohd Azahari Shah  
**Status:** ✅ Complete and Tested

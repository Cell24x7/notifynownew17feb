# 🚀 Quick Fix Guide - Enable Channels

## Problem
Aapko 403 errors aa rahe hain kyunki database mein aapke channels enabled nahi hain.

## Solution (3 Simple Steps)

### Step 1: MySQL Workbench Open Karo
1. MySQL Workbench kholo
2. Apne database connection par click karo
3. Password enter karo aur connect karo

### Step 2: Ye SQL Commands Run Karo

```sql
-- Apne account ke liye saare channels enable karo
UPDATE users 
SET channels_enabled = '["whatsapp","sms","email","rcs"]' 
WHERE id = 24;

-- Check karo ki update ho gaya
SELECT id, email, channels_enabled FROM users WHERE id = 24;
```

**Expected Output:**
```
id: 24
email: vpal80863@gmail.com
channels_enabled: ["whatsapp","sms","email","rcs"]
```

### Step 3: Logout aur Login Karo
1. Browser mein apne application se **Logout** karo
2. Phir se **Login** karo (`vpal80863@gmail.com`)
3. Ab channels enabled ho jayenge!

---

## ✅ Testing

### Test 1: Campaign Create Karo
1. Campaigns page par jao
2. "Create Campaign" button click karo
3. Koi bhi channel select karo (WhatsApp, SMS, Email, RCS)
4. Form fill karo aur submit karo
5. **403 error nahi aana chahiye!** ✅

### Test 2: Template Create Karo
1. Templates tab par jao
2. "New Template" button click karo
3. Channel select karo
4. Template form fill karo
5. "Submit for Approval" click karo
6. **Template create ho jayega!** ✅

### Test 3: Template Approve Karo (Admin Only)
1. Admin account se login karo (`admin@cell24x7.com`)
2. Templates tab par jao
3. **"Pending Approvals" tab** click karo 👈 **YE NAYA HAI!**
4. Pending templates dikhenge with full preview
5. Green "Approve" button ya Red "Reject" button click karo
6. **Template approved/rejected ho jayega!** ✅

---

## 📍 Template Approval Kaha Se Karein?

### Admin Users Ke Liye:
```
Campaigns Page → Templates Tab → "Pending Approvals" Sub-Tab
```

Yaha aapko:
- ✅ Saare pending templates dikhenge
- ✅ Full template preview milega (header, body, footer, buttons)
- ✅ Approve/Reject buttons honge
- ✅ Template details (created date, channel, category) dikhenge

### Screenshots Location:
- **Pending Approvals Tab**: Templates section mein Clock icon ke saath
- **Approve Button**: Green button with checkmark
- **Reject Button**: Red button with X icon

---

## ⚠️ Important Notes

1. **SQL script run karna ZAROORI hai** - Bina iske 403 error aata rahega
2. **Logout/Login karna ZAROORI hai** - Naye channels activate karne ke liye
3. **Admin account chahiye** - Template approval ke liye admin role hona chahiye

---

## 🎯 Summary

1. ✅ SQL script run karo (enable channels)
2. ✅ Logout/Login karo (refresh session)
3. ✅ Templates tab → "Pending Approvals" → Approve/Reject

**Ab sab kuch kaam karega!** 🎉

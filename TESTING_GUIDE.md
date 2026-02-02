# 🧪 Template Approval Testing Guide

## ⚡ Quick Test (3 Steps)

### Step 1: Run SQL Script
```sql
-- File: backend/scripts/setup_test_templates.sql
-- Open MySQL Workbench and run this entire script
```

### Step 2: Check Backend Console
Backend terminal mein ye logs dikhne chahiye jab aap approve/reject karoge:
```
📝 Template status update request: { templateId: 'TPL...', newStatus: 'approved', ... }
✅ Template found: { id: 'TPL...', name: '...', status: 'pending' }
✅ Template status updated successfully
```

### Step 3: Test in Browser
1. **Logout/Login** as admin (`admin@cell24x7.com`)
2. **Left Sidebar → Templates** click karo
3. **Pending tab** mein templates dikhenge
4. **Approve button** click karo
5. **Browser Console (F12)** mein check karo:
   ```
   🔄 Attempting to update template: { templateId: "TPL...", status: "approved" }
   ✅ Template status update response: { success: true, ... }
   ```

---

## 🐛 If Approve/Reject Not Working

### Check 1: Backend Logs
Backend terminal mein dekho:
- ✅ `📝 Template status update request` - Request aa rahi hai
- ❌ `Access denied: User is not admin` - Admin role nahi hai
- ❌ `Template not found` - Template ID galat hai

### Check 2: Browser Console (F12)
```javascript
// Success case:
🔄 Attempting to update template: {...}
✅ Template status update response: {...}

// Error case:
❌ Approve template error: {...}
Error details: { message: "...", response: {...} }
```

### Check 3: Network Tab (F12)
1. Network tab open karo
2. Approve button click karo
3. `PATCH /api/templates/TPL.../status` request dekho
4. Response check karo:
   - ✅ Status 200 = Success
   - ❌ Status 403 = Admin access denied
   - ❌ Status 404 = Template not found
   - ❌ Status 500 = Server error

---

## 🔍 Common Issues & Solutions

### Issue 1: "No templates found"
**Solution**: SQL script run karo (setup_test_templates.sql)

### Issue 2: "Admin access required"
**Solution**: 
- Admin se login karo (`admin@cell24x7.com`)
- Database mein user role check karo:
  ```sql
  SELECT id, email, role FROM users WHERE email = 'admin@cell24x7.com';
  ```
- Role should be `'admin'` or `'superadmin'`

### Issue 3: Approve button click hota hai but kuch nahi hota
**Solution**:
- Browser console check karo (F12)
- Backend terminal check karo
- Network tab mein request dekho

### Issue 4: "Template not found"
**Solution**:
- Template ID sahi hai ya nahi check karo
- Database mein template exists karta hai:
  ```sql
  SELECT id, name, status FROM message_templates;
  ```

---

## ✅ Expected Behavior

### When you click "Approve":
1. **Frontend**: Console mein `🔄 Attempting to update template` dikhe
2. **Backend**: Console mein `📝 Template status update request` dikhe
3. **Backend**: `✅ Template status updated successfully` dikhe
4. **Frontend**: Green toast notification: "✅ Template Approved"
5. **UI**: Template "Pending" tab se "Approved" tab mein move ho jaye

### When you click "Reject":
1. Same as above, but status = 'rejected'
2. Red toast notification: "❌ Template Rejected"
3. Template "Rejected" tab mein move ho jaye

---

## 🎯 Final Checklist

- [ ] SQL script run kiya (setup_test_templates.sql)
- [ ] Admin se login kiya
- [ ] Templates page khola
- [ ] Pending tab mein 3 templates dikhe
- [ ] Approve button click kiya
- [ ] Backend console mein logs dikhe
- [ ] Browser console mein logs dikhe
- [ ] Toast notification dikha
- [ ] Template Approved tab mein move ho gaya
- [ ] Reject button bhi test kiya

---

## 📝 Debugging Commands

### Check admin role:
```sql
SELECT id, email, role FROM users WHERE email = 'admin@cell24x7.com';
```

### Check templates:
```sql
SELECT id, name, channel, status FROM message_templates ORDER BY created_at DESC;
```

### Update admin role manually (if needed):
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@cell24x7.com';
```

---

## 🚀 All Good? Test Complete Workflow

1. Create new template as normal user
2. Login as admin
3. Go to Templates → Pending
4. See new template
5. Approve it
6. Logout
7. Login as normal user
8. Use approved template in campaign

**Sab kaam kar raha hai!** ✅

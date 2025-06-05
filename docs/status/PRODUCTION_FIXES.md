# 🚀 CookCam Production Fixes - Ready to Deploy

## 🎯 **Issue 1: Signup Error Serialization** 

**Problem**: Supabase errors don't serialize properly, returning `{"error":"{}"}`  
**Fix**: Update error handling in auth route  
**File**: `/var/www/cookcam-api/src/routes/auth.ts` (needs to be rebuilt)

### **Immediate Fix Code**:

```typescript
// In the signup route, replace the current error handling:

if (authError) {
  logger.error('Supabase signup error:', {
    message: authError.message,
    status: authError.status,
    code: authError.code || 'SIGNUP_ERROR'
  });
  return res.status(400).json({ 
    error: authError.message || 'Failed to create account',
    code: authError.code || 'SIGNUP_ERROR'
  });
}

// Also add this at the top of the catch block:
} catch (error) {
  logger.error('Signup error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    error: error
  });
  res.status(500).json({ 
    error: error instanceof Error ? error.message : 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}
```

### **Deploy Command**:
```bash
# SSH to server and apply fix
ssh root@64.23.236.43

# Navigate to project directory
cd /var/www/cookcam-api

# Create backup
cp src/routes/auth.ts src/routes/auth.ts.backup

# Apply the fix (edit the file with the new error handling)
# Then rebuild and restart:
npm run build
pm2 restart cookcam-api
pm2 logs cookcam-api --lines 5
```

---

## 🎯 **Issue 2: Image Processing Analysis**

**Problem**: "Internal server error" during scan analysis  
**Status**: Need to test scan endpoint  

### **Debugging Steps**:

```bash
# 1. Test scan endpoint with authenticated request
# First get a valid token by logging in:
curl -X POST http://64.23.236.43:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"existing@user.com","password":"password"}' \
  > login_result.json

# Extract token from result
TOKEN=$(cat login_result.json | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# 2. Test scan endpoint with minimal image data
curl -X POST http://64.23.236.43:3000/api/v1/scan/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD//gAJQ3JlYXRlZCB3aXRoIGFqZW5jb2RlciBvbiAyMDE5LTA2LTE5LiAJAP/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhoqChkKFxcYGhopKiEmKSEoGR8eKScpKiMmJC8QIr/bAEMBBwcHCggKEwoKEy4cGhwuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLv/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygZGhQrHB0fAjM+Hy8RQWMJKio/EXNXFzckNwdHmqf/9oADAMBQIRAxEAPwD/2Q==",
    "detected_ingredients": []
  }' \
  -v > scan_result.json

# 3. Check result and logs
cat scan_result.json
ssh root@64.23.236.43 "pm2 logs cookcam-api --lines 10"
```

### **If OpenAI API Issue**:
```bash
# Check OpenAI configuration
ssh root@64.23.236.43 "pm2 env 0 | grep OPENAI"

# Test OpenAI API directly
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}],"max_tokens":5}'
```

---

## 🧪 **Testing Protocol**

### **After Signup Fix**:
1. **Test new user signup** in mobile app
2. **Verify error logs** are detailed and helpful
3. **Check successful registration** flow

### **After Image Processing Fix**:
1. **Test ingredient scanning** in mobile app
2. **Verify AI responses** are generated
3. **Check scan results** display properly

---

## 📋 **Quick Deploy Checklist**

### **Priority 1: Signup Fix** (15 minutes)
- [ ] SSH to production server
- [ ] Backup current auth.ts file
- [ ] Apply error handling fix
- [ ] Rebuild TypeScript (`npm run build`)
- [ ] Restart PM2 process
- [ ] Test signup endpoint with curl
- [ ] Test signup in mobile app

### **Priority 2: Image Processing** (30 minutes)
- [ ] Test scan endpoint directly
- [ ] Check OpenAI API configuration
- [ ] Review scan route error handling
- [ ] Test end-to-end image scanning
- [ ] Verify ingredient results display

---

## 🚨 **Emergency Rollback**

If anything breaks during deployment:

```bash
# Restore backup
cd /var/www/cookcam-api
cp src/routes/auth.ts.backup src/routes/auth.ts
npm run build
pm2 restart cookcam-api

# Check health
curl http://64.23.236.43:3000/health
```

---

## ✅ **Success Criteria**

**Signup Working**:
- New users can register successfully
- Error messages are clear and helpful
- No `{"error":"{}"}` responses

**Image Processing Working**:
- Camera captures images successfully
- AI analyzes ingredients correctly
- Results display in mobile app

---

*Ready to Deploy: December 19, 2024*  
*Estimated Fix Time: 45 minutes total*  
*Risk Level: Low (non-breaking changes with rollback plan)* 
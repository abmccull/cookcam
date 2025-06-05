# CI/CD Setup Guide

This document explains how to configure GitHub Actions for automatic deployment to our Digital Ocean server.

## Prerequisites

- GitHub repository with admin access
- Digital Ocean server (64.23.236.43) with SSH access
- PM2 running on the server

## GitHub Secrets Configuration

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add these secrets:

### Required Secrets

1. **`DO_HOST`**
   - Value: `64.23.236.43`
   - Description: Digital Ocean server IP address

2. **`DO_USERNAME`** 
   - Value: `root`
   - Description: SSH username for the server

3. **`DO_SSH_KEY`**
   - Value: Your private SSH key content
   - Description: SSH private key for authentication
   - **How to get this:**
     ```bash
     # On your local machine, copy your private key
     cat ~/.ssh/id_rsa
     ```
     Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

## Workflow Features

### Automatic Deployment
- **Triggers:** Pushes to `main` branch that modify `backend/api/**` files
- **Manual trigger:** Available via GitHub Actions UI

### Safety Features
- **Backup:** Creates timestamped backups before deployment
- **Health checks:** Verifies service is running after deployment  
- **Rollback:** Automatically rolls back if health check fails
- **Cleanup:** Keeps only last 5 backups to save disk space

### Deployment Process
1. ✅ Checkout code
2. ✅ Setup Node.js environment
3. ✅ Install dependencies  
4. ✅ Run tests (if available)
5. ✅ Build TypeScript
6. ✅ Create deployment package
7. ✅ Backup current deployment
8. ✅ Upload and extract new files
9. ✅ Install production dependencies
10. ✅ Restart PM2 service
11. ✅ Verify health
12. ✅ Cleanup or rollback

## Testing the Setup

1. **Add the secrets** to your GitHub repository
2. **Commit and push** this workflow file:
   ```bash
   git add .github/workflows/backend-deploy.yml
   git commit -m "Add CI/CD pipeline for backend deployment"
   git push origin main
   ```
3. **Monitor the deployment** in GitHub Actions tab
4. **Verify the service** is running: `curl http://64.23.236.43:3000/health`

## Manual Deployment

You can also trigger deployment manually:
1. Go to **Actions** tab in GitHub
2. Select **Deploy Backend to Production**
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

## Troubleshooting

### Common Issues

**❌ SSH Connection Failed**
- Verify `DO_HOST` and `DO_USERNAME` secrets are correct
- Ensure `DO_SSH_KEY` contains the complete private key including headers

**❌ Health Check Failed**
- Check if port 3000 is accessible on the server
- Verify PM2 service name is `cookcam-api`
- Check server logs: `ssh root@64.23.236.43 "pm2 logs cookcam-api"`

**❌ Build Failed**
- Check TypeScript compilation errors in GitHub Actions logs
- Verify all dependencies are in package.json

### Manual Verification

Check deployment status on server:
```bash
ssh root@64.23.236.43 "pm2 status && curl -s http://localhost:3000/health"
```

## Benefits

✅ **Reliable deployments** - No more manual SSH and file copying
✅ **Automatic backups** - Easy rollback if something breaks  
✅ **Health checks** - Catch deployment issues immediately
✅ **Zero downtime** - PM2 handles graceful restarts
✅ **Audit trail** - All deployments tracked in GitHub

---

Now when you push backend changes to main branch, they'll automatically deploy to production! 🚀 
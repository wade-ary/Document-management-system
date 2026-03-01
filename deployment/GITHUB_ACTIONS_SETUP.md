# TransformoDocs - Complete EC2 Deployment & GitHub Actions Setup

This comprehensive guide will help you deploy your Flask application to EC2 and set up automatic deployment using GitHub Actions whenever you push changes to your backend code.

## 🎯 Overview

Your repository now includes:
- **Automatic CI/CD**: Deploy on every backend code change
- **Production Configuration**: Optimized for EC2 deployment
- **Health Monitoring**: Automated system checks
- **Manual Deployment**: On-demand deployment control

## 📁 Repository Structure

```
├── app.py                     # Main Flask application
├── backend/                   # Backend modules
├── frontend/                  # Frontend code (not auto-deployed)
├── .github/workflows/         # GitHub Actions workflows
│   ├── deploy.yml            # Auto-deployment on push
│   ├── manual-deploy.yml     # Manual deployment trigger
│   └── health-check.yml      # Automated health checks
├── deploy.sh                 # Initial EC2 setup script
├── update_deploy.sh          # Update deployment script
├── test_deployment.sh        # Test deployment functionality
├── pyproject.toml           # Poetry dependencies and project config
├── poetry.lock              # Poetry dependency lock file
├── .env.production          # Production environment variables
├── gunicorn_start.sh        # Gunicorn startup script
├── supervisor.conf          # Process management
└── nginx.conf              # Web server configuration
```

## Prerequisites

1. **EC2 Instance**: Your EC2 instance should be already set up with the initial deployment
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **SSH Access**: You should have SSH access to your EC2 instance

## Step 1: Configure GitHub Secrets

You need to add the following secrets to your GitHub repository:

### Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **Repository Secrets**:

1. **EC2_HOST**
   - Value: Your EC2 instance's public IP address
   - Example: `54.123.456.789`

2. **EC2_USER** 
   - Value: `ubuntu` (for Ubuntu instances) or `ec2-user` (for Amazon Linux)

3. **EC2_SSH_KEY**
   - Value: Your private SSH key content (the `.pem` file content)
   - Copy the entire content of your `.pem` file including:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   [your key content]
   -----END RSA PRIVATE KEY-----
   ```

### How to add secrets:

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact names above

## Step 2: Verify Your EC2 Instance Setup

Make sure your EC2 instance has the initial deployment completed. If not, run:

```bash
# On your EC2 instance
sudo ./deploy.sh
```

## Step 3: Test the GitHub Actions Workflow

### Method 1: Push a change
Make any change to your backend code (not in `frontend/` folder) and push:

```bash
git add .
git commit -m "test: trigger deployment"
git push origin main
```

### Method 2: Manually trigger (if you add workflow_dispatch)
You can also manually trigger the workflow from GitHub:
1. Go to your repository
2. Click **Actions** tab
3. Select the **Deploy to EC2** workflow
4. Click **Run workflow**

## Step 4: Monitor Deployment

1. **GitHub Actions**: Check the Actions tab in your repository to see deployment progress
2. **EC2 Logs**: SSH into your EC2 instance and check logs:
   ```bash
   # Application logs
   sudo tail -f /var/www/transformo/logs/supervisor.log
   
   # Nginx logs
   sudo tail -f /var/log/nginx/error.log
   
   # Service status
   sudo supervisorctl status transformo
   ```

## What the Workflow Does

The GitHub Actions workflow:

1. **Triggers on**:
   - Push to `main` or `master` branch
   - Only when files outside `frontend/` and `project/` folders change

2. **Testing Phase**:
   - Checks Python syntax
   - Verifies imports work correctly
   - Validates dependencies

3. **Deployment Phase** (only if tests pass):
   - Connects to your EC2 instance via SSH
   - Pulls latest code from GitHub
   - Updates Python dependencies if needed
   - Restarts the application service
   - Performs health checks
   - Reports success/failure

## Troubleshooting

### Common Issues:

1. **SSH Connection Failed**
   - Verify `EC2_HOST` is correct public IP
   - Verify `EC2_USER` is correct (`ubuntu` for Ubuntu, `ec2-user` for Amazon Linux)
   - Verify `EC2_SSH_KEY` contains the complete private key
   - Check EC2 Security Group allows SSH (port 22) from GitHub Actions IPs

2. **Application Won't Start**
   - Check supervisor logs: `sudo tail -f /var/www/transformo/logs/supervisor.log`
   - Verify environment variables in `.env.production`
   - Check file permissions: `ls -la /var/www/transformo/`

3. **GitHub Actions Fails**
   - Check the Actions tab for detailed error messages
   - Verify all secrets are correctly set
   - Make sure EC2 instance is running

### Debugging Commands:

```bash
# On EC2 instance
# Check application status
sudo supervisorctl status transformo

# Restart application manually
sudo supervisorctl restart transformo

# Check nginx status
sudo systemctl status nginx

# Test application directly
curl http://localhost/

# Check recent commits
cd /var/www/transformo
git log --oneline -5
```

## Security Best Practices

1. **SSH Key Security**:
   - Use a dedicated SSH key for deployments
   - Regularly rotate SSH keys
   - Never share or commit SSH keys to version control

2. **Environment Variables**:
   - Keep sensitive data in `.env.production`
   - Never commit API keys or secrets to GitHub
   - Use GitHub Secrets for all sensitive configuration

3. **EC2 Security**:
   - Restrict SSH access to necessary IPs only
   - Keep your EC2 instance updated
   - Use IAM roles when possible

## Advanced Configuration

### Adding Slack/Discord Notifications

You can extend the workflow to send notifications to Slack or Discord when deployments succeed or fail.

### Rollback Capability

The deployment script automatically creates backups, but you can enhance it with automatic rollback on failure.

### Blue-Green Deployment

For zero-downtime deployments, consider implementing blue-green deployment strategy.

## Files Created

The following files were created for your deployment:

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `requirements.txt` - Python dependencies for production
- `deploy.sh` - Initial deployment script
- `update_deploy.sh` - Update deployment script
- `gunicorn_start.sh` - Gunicorn startup script
- `supervisor.conf` - Supervisor configuration
- `nginx.conf` - Nginx configuration
- `.env.production` - Production environment variables

## Next Steps

1. Set up the GitHub secrets as described above
2. Push a test change to trigger the deployment
3. Monitor the deployment in GitHub Actions
4. Verify your application is accessible at `http://YOUR_EC2_IP`
5. Update your frontend to use the EC2 URL instead of localhost

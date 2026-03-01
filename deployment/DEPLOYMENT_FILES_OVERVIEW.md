# Files Overview - TransformoDocs Deployment

## 📂 Deployment Files (Keep These)

### GitHub Actions Workflows
- `.github/workflows/deploy.yml` - Auto-deployment on code changes
- `.github/workflows/manual-deploy.yml` - Manual deployment trigger
- `.github/workflows/health-check.yml` - Health monitoring

### Deployment Scripts
- `deploy.sh` - Initial EC2 setup and deployment
- `update_deploy.sh` - Smart update deployment
- `test_deployment.sh` - Test deployment functionality

### Configuration Files
- `pyproject.toml` - Poetry dependencies and project configuration
- `poetry.lock` - Poetry dependency lock file (ensures consistent versions)
- `.env.production` - Production environment variables
- `gunicorn_start.sh` - Gunicorn startup script
- `supervisor.conf` - Process management configuration
- `nginx.conf` - Web server configuration

### Documentation
- `GITHUB_ACTIONS_SETUP.md` - Complete setup guide

## 🗑️ Files Removed (No Longer Needed)

- `setup_ec2.sh` - Redundant with deploy.sh
- `DEPLOYMENT_GUIDE.md` - Consolidated into main guide
- `EC2_DEPLOYMENT_README.md` - Consolidated into main guide
- `frontend_config.js` - Should be integrated into actual frontend
- `wsgi.py` - Not needed with gunicorn setup

## 📋 Next Steps

1. Follow the setup guide in `GITHUB_ACTIONS_SETUP.md`
2. Configure GitHub Secrets
3. Run initial deployment with `./deploy.sh`
4. Test automatic deployment by pushing code changes

## 💡 Usage

- **Automatic**: Push to main branch → Auto-deploy
- **Manual**: GitHub Actions → Run "Manual Deploy" workflow
- **Testing**: Use `./test_deployment.sh YOUR_EC2_IP`
- **Monitoring**: Health checks run every 30 minutes

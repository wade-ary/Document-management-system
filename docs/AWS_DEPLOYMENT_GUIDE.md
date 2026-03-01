# SIH2025 Backend AWS Deployment Guide

## 🚀 Quick Setup

This guide will help you deploy your Flask backend to AWS using Docker, ECS Fargate, and Application Load Balancer with automated CI/CD.

## 📋 Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
   sudo installer -pkg AWSCLIV2.pkg -target /
   
   # Configure AWS credentials
   aws configure
   ```

2. **Docker installed**
   ```bash
   # Install Docker Desktop for Mac
   # Download from: https://docs.docker.com/desktop/mac/install/
   ```

3. **GitHub Repository Setup**
   - Ensure your code is pushed to GitHub
   - Repository should be public or you have proper access tokens

## 🛠️ Automated Setup

### Step 1: Run the Setup Script
```bash
cd /Users/aryanrajpurkar/Projects/SIH2025-25080
./aws/setup.sh
```

This script will:
- ✅ Create ECR repository
- ✅ Set up Parameter Store for secrets
- ✅ Deploy CloudFormation infrastructure
- ✅ Build and push initial Docker image
- ✅ Configure ECS service

### Step 2: Configure Secrets

Update AWS Parameter Store with your actual values:

```bash
# MongoDB URI
aws ssm put-parameter --name "/sih2025/mongo-uri" --value "your_mongo_connection_string" --type "SecureString" --overwrite

# SendGrid API Key
aws ssm put-parameter --name "/sih2025/sendgrid-api-key" --value "your_sendgrid_api_key" --type "SecureString" --overwrite

# Clerk Auth Token  
aws ssm put-parameter --name "/sih2025/clerk-auth-token" --value "your_clerk_auth_token" --type "SecureString" --overwrite

# OpenAI API Key
aws ssm put-parameter --name "/sih2025/openai-api-key" --value "your_openai_api_key" --type "SecureString" --overwrite
```

### Step 3: Setup GitHub Actions

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

1. **AWS_ACCESS_KEY_ID**: Your AWS access key
2. **AWS_SECRET_ACCESS_KEY**: Your AWS secret key

To create an IAM user for GitHub Actions:
```bash
# Create IAM policy
aws iam create-policy --policy-name GitHubActionsECSPolicy --policy-document file://aws/github-actions-policy.json

# Create IAM user
aws iam create-user --user-name github-actions-user

# Attach policy to user
aws iam attach-user-policy --user-name github-actions-user --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/GitHubActionsECSPolicy

# Create access key
aws iam create-access-key --user-name github-actions-user
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/aws-deploy.yml`) will automatically:

1. **Trigger on push to main** when any `.py` or `.sh` files change
2. **Build Docker image** using the Dockerfile
3. **Push to ECR** with proper tagging
4. **Update ECS task definition** with new image
5. **Deploy to ECS service** with zero-downtime deployment
6. **Provide backend URL** in the deployment summary

## 🌐 Getting Your Backend URL

After deployment, you'll get your backend URL from:

1. **GitHub Actions summary** (after successful deployment)
2. **AWS Console**: 
   - Go to ECS > Clusters > sih2025-cluster > Services
   - Click on sih2025-backend-service
   - Find the Load Balancer section
3. **CLI Command**:
   ```bash
   aws cloudformation describe-stacks --stack-name sih2025-backend-infrastructure --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" --output text
   ```

## 🔧 Local Development

### Using Docker Compose
```bash
# Start all services (backend + MongoDB)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Using Poetry (Traditional)
```bash
# Install dependencies
poetry install

# Activate virtual environment
poetry shell

# Run development server
python app.py
```

## 📊 Monitoring & Debugging

### CloudWatch Logs
- **Log Group**: `/ecs/sih2025-backend`
- **URL**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups

### ECS Service Health
```bash
# Check service status
aws ecs describe-services --cluster sih2025-cluster --services sih2025-backend-service

# Check tasks
aws ecs list-tasks --cluster sih2025-cluster --service-name sih2025-backend-service

# Get task logs
aws ecs describe-tasks --cluster sih2025-cluster --tasks TASK_ARN
```

### Health Check Endpoints
- **Application**: `http://YOUR_ALB_URL/`
- **Detailed Health**: `http://YOUR_ALB_URL/health` (if implemented)

## 🎯 Frontend Integration

Use your Load Balancer URL in your frontend configuration:

```javascript
// Next.js example - next.config.js
module.exports = {
  env: {
    BACKEND_URL: 'http://your-alb-url.us-east-1.elb.amazonaws.com'
  }
}

// React example - .env
REACT_APP_BACKEND_URL=http://your-alb-url.us-east-1.elb.amazonaws.com

// API calls example
const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/endpoint`);
```

## 🛡️ Security Notes

1. **HTTPS**: For production, configure SSL/TLS certificate on the ALB
2. **Environment Variables**: Never commit secrets to repository
3. **CORS**: Configured to allow all origins (update for production)
4. **Rate Limiting**: Basic rate limiting implemented in nginx

## 🔄 Scaling

### Auto Scaling
```bash
# Enable auto scaling
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id service/sih2025-cluster/sih2025-backend-service \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity 1 \
    --max-capacity 10
```

### Manual Scaling
```bash
# Scale to 3 instances
aws ecs update-service \
    --cluster sih2025-cluster \
    --service sih2025-backend-service \
    --desired-count 3
```

## 🆘 Troubleshooting

### Common Issues

1. **Service won't start**: Check CloudWatch logs
2. **502/503 errors**: Health check failing, check application logs
3. **Docker build fails**: Check Dockerfile and dependencies
4. **GitHub Actions fails**: Check repository secrets

### Debug Commands
```bash
# Get service events
aws ecs describe-services --cluster sih2025-cluster --services sih2025-backend-service --query 'services[0].events'

# Get task definition
aws ecs describe-task-definition --task-definition sih2025-backend-task

# Force new deployment
aws ecs update-service --cluster sih2025-cluster --service sih2025-backend-service --force-new-deployment
```

## 📞 Support

For issues:
1. Check CloudWatch logs first
2. Verify Parameter Store values
3. Ensure GitHub secrets are properly set
4. Check ECS service health in AWS Console

---

**🎉 Your backend is now ready for production deployment with automatic CI/CD!**
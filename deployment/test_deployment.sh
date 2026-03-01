#!/bin/bash

# Simple test script to verify deployment
EC2_IP=$1

if [ -z "$EC2_IP" ]; then
    echo "Usage: ./test_deployment.sh <EC2_PUBLIC_IP>"
    exit 1
fi

echo "🧪 Testing TransformoDocs deployment on $EC2_IP"

# Test basic endpoint
echo "Testing basic endpoint..."
if curl -s "http://$EC2_IP" | grep -q "Hello"; then
    echo "✅ Basic endpoint working"
else
    echo "❌ Basic endpoint failed"
fi

# Test a more complex endpoint (if available)
echo "Testing health/status..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP/")
if [ "$STATUS_CODE" -eq 200 ]; then
    echo "✅ Server responding with 200 OK"
else
    echo "⚠️ Server responding with status code: $STATUS_CODE"
fi

echo "🎯 Test completed. Your app should be accessible at: http://$EC2_IP"

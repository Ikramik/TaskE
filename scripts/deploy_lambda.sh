#!/bin/bash

echo " Deploying TaskE Lambda Function & API Gateway"
echo "=" * 50

# Step 1: Create Lambda deployment package
echo "Creating Lambda deployment package..."
cd lambda
zip -r sagemaker_proxy.zip sagemaker_proxy.py
cd ..

# Step 2: Deploy Lambda function
echo " Deploying Lambda function..."
aws lambda create-function \
    --function-name taske-ai-proxy \
    --runtime python3.9 \
    --role arn:aws:iam::038462748981:role/service-role/AmazonSageMaker-ExecutionRole-20251114T213666 \
    --handler sagemaker_proxy.lambda_handler \
    --zip-file fileb://lambda/sagemaker_proxy.zip \
    --timeout 30 \
    --memory-size 128

echo " Lambda function deployed!"

# Step 3: Create API Gateway
echo " Creating API Gateway..."
API_ID=$(aws apigateway create-rest-api --name "taske-ai-api" --query 'id' --output text)
echo "   API ID: $API_ID"

# Step 4: Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# Step 5: Create /predict resource
RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part "predict" \
    --query 'id' --output text)

# Step 6: Create POST method
echo " Creating POST method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE

# Step 7: Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name taske-ai-proxy --query 'Configuration.FunctionArn' --output text)

# Step 8: Integrate with Lambda
echo " Integrating with Lambda..."
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"

# Step 9: Deploy API
echo " Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name "prod"

# Step 10: Add Lambda permission
echo " Adding Lambda permission..."
aws lambda add-permission \
    --function-name taske-ai-proxy \
    --statement-id apigateway-test \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:038462748981:$API_ID/*/POST/predict"

# Step 11: Get the final URL
echo ""
echo " DEPLOYMENT COMPLETE!"
echo "=" * 50
echo " Your API Gateway URL:"
echo "   https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/predict"
echo ""
echo " Test with:"
echo "   curl -X POST https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/predict \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"text\":\"add meeting at 3pm\"}'"
echo ""
echo " Update QuickAIService.js with this URL!"
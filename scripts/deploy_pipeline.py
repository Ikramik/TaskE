# scripts/deploy_pipeline.py
import boto3
import time
import json

def deploy_full_pipeline():
    # Initialize clients
    sagemaker = boto3.client('sagemaker', region_name='us-east-1')
    lambda_client = boto3.client('lambda', region_name='us-east-1')
    apigateway = boto3.client('apigateway', region_name='us-east-1')
    
    print("🚀 Starting full pipeline deployment...")
    
    # Step 1: Upload training data
    print("1. 📤 Uploading training data to S3...")
    # Run your existing upload_to_s3.py
    import upload_to_s3
    upload_to_s3.upload_to_s3()
    
    # Step 2: Create training job
    print("2. 🧠 Creating SageMaker training job...")
    import sagemaker_train
    estimator = sagemaker_train.create_sagemaker_training_job()
    
    print("✅ Pipeline deployment initiated!")
    print("📋 Next steps:")
    print("   - Wait for training job to complete")
    print("   - Deploy endpoint using the estimator")
    print("   - Create API Gateway and Lambda")
    print("   - Update QuickAIService with the API URL")

if __name__ == "__main__":
    deploy_full_pipeline()
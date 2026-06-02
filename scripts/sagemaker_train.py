import boto3
import json
import time
from sagemaker.tensorflow import TensorFlow

def create_sagemaker_training_job():
    # SageMaker configuration
    BUCKET_NAME = 'taske-training-data'
    TRAINING_DATA_PATH = 's3://{}/training/taskbot/v1/training_data.json'.format(BUCKET_NAME)
    OUTPUT_PATH = 's3://{}/models/taskbot'.format(BUCKET_NAME)
    
    role = 'arn:aws:iam::038462748981:role/service-role/AmazonSageMaker-ExecutionRole-20251114T213666'
    print(f"Using IAM role: {role}")
    
    estimator = TensorFlow(
        entry_point='train_taskbot.py',
        source_dir='scripts/sagemaker_source',
        role=role,
        instance_count=1,
        instance_type='ml.m5.large', 
        framework_version='2.13.0',
        py_version='py310',  
        output_path=OUTPUT_PATH,
        hyperparameters={
            'epochs': 30,
            'batch_size': 16,
            'learning_rate': 0.001,
            'vocab_size': 5000,
            'embedding_dim': 128
        }
    )
    
    # Start training job
    print("Starting SageMaker training job...")
    print(f"Training data: {TRAINING_DATA_PATH}")
    print(f"Output path: {OUTPUT_PATH}")
    
    estimator.fit({'training': TRAINING_DATA_PATH})
    
    return estimator

def deploy_model(estimator):
    """Deploy the trained model to an endpoint"""
    print("Deploying model to SageMaker endpoint...")
    
    # Deploy the model (use CPU for endpoint to save costs)
    predictor = estimator.deploy(
        initial_instance_count=1,
        instance_type='ml.t2.medium',  # CPU for endpoint (cheaper)
        endpoint_name='taske-intent-classifier-v2',
        wait=True
    )
    
    print("Model deployed successfully!")
    print(f"Endpoint name: taske-intent-classifier-v1")
    
    return predictor

if __name__ == "__main__":
    # Step 1: Train the model
    estimator = create_sagemaker_training_job()
    
    # Step 2: Deploy the model
    print("\nTraining completed! Starting deployment...")
    predictor = deploy_model(estimator)
    
    print("\n Pipeline completed successfully!")
    print("Next steps:")
    print("   1. Create Lambda function with sagemaker_proxy.py")
    print("   2. Create API Gateway")
    print("   3. Update QuickAIService.js with API Gateway URL")
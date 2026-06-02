import boto3
import tarfile
import os
import shutil
import time

# --- CONFIGURATION ---
# Using the ID of your last SUCCESSFUL training job
SUCCESSFUL_JOB_NAME = "tensorflow-training-2025-12-10-19-53-26-592"
BUCKET = "taske-training-data"
MODEL_KEY = "models/taskbot/model.tar.gz"
ENDPOINT_NAME = "taske-v3"
CONFIG_NAME = "taske-config-v4"  # New config version
MODEL_NAME = "taske-model-v4"    # New model version

s3 = boto3.client('s3')
sm = boto3.client('sagemaker')

def fix_it():
    print(f"🚀 STARTING REPAIR using model from: {SUCCESSFUL_JOB_NAME}")

    # 1. Get the Old Working Model Artifact
    print("⬇️  Downloading original trained model...")
    response = sm.describe_training_job(TrainingJobName=SUCCESSFUL_JOB_NAME)
    artifact_url = response['ModelArtifacts']['S3ModelArtifacts']
    
    # Parse S3 URL
    old_key = artifact_url.replace(f"s3://{BUCKET}/", "")
    s3.download_file(BUCKET, old_key, "original_model.tar.gz")
    
    # 2. Extract and Add Code
    print("📦 Re-packaging with correct structure...")
    if os.path.exists("temp_build"): shutil.rmtree("temp_build")
    os.makedirs("temp_build/code", exist_ok=True)
    
    # Extract model
    with tarfile.open("original_model.tar.gz", "r:gz") as tar:
        tar.extractall("temp_build")
        
    # Copy our fixed inference script into 'code/'
    shutil.copy("sagemaker_source/inference.py", "temp_build/code/inference.py")
    
    # Create new tarball
    with tarfile.open("fixed_model.tar.gz", "w:gz") as tar:
        tar.add("temp_build", arcname=".")
        
    # 3. Upload Fixed Model
    print("⬆️  Uploading fixed model to S3...")
    s3.upload_file("fixed_model.tar.gz", BUCKET, MODEL_KEY)
    
    # 4. Create New Model Definition (WITH ENV VARS)
    print("🤖 Creating new SageMaker Model (v4)...")
    model_url = f"s3://{BUCKET}/{MODEL_KEY}"
    
    # Delete if exists
    try: sm.delete_model(ModelName=MODEL_NAME)
    except: pass
    
    sm.create_model(
        ModelName=MODEL_NAME,
        PrimaryContainer={
            'Image': response['AlgorithmSpecification']['TrainingImage'], # Use same image as training
            'ModelDataUrl': model_url,
            'Environment': {
                'SAGEMAKER_PROGRAM': 'inference.py',
                'SAGEMAKER_SUBMIT_DIRECTORY': '/opt/ml/model/code',
                'SAGEMAKER_CONTAINER_LOG_LEVEL': '20',
                'SAGEMAKER_REGION': 'us-east-1'
            }
        },
        ExecutionRoleArn=response['RoleArn']
    )

    # 5. Create New Endpoint Config
    print("⚙️  Creating new Endpoint Config (v4)...")
    try: sm.delete_endpoint_config(EndpointConfigName=CONFIG_NAME)
    except: pass
    
    sm.create_endpoint_config(
        EndpointConfigName=CONFIG_NAME,
        ProductionVariants=[{
            'VariantName': 'AllTraffic',
            'ModelName': MODEL_NAME,
            'InitialInstanceCount': 1,
            'InstanceType': 'ml.t2.medium'
        }]
    )

    # 6. Update Endpoint
    print("🔄 Updating Endpoint (This takes 5-8 mins)...")
    sm.update_endpoint(
        EndpointName=ENDPOINT_NAME,
        EndpointConfigName=CONFIG_NAME
    )
    print("✅ UPDATE TRIGGERED! Check status in AWS Console.")

if __name__ == "__main__":
    fix_it()
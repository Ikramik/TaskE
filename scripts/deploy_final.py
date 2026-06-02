import boto3
import tarfile
import os
import shutil
import time

# --- CONFIGURATION ---
# Using your known good training job
SUCCESSFUL_JOB_NAME = "tensorflow-training-2025-12-10-19-53-26-592"
BUCKET = "taske-training-data"
MODEL_KEY = "models/taskbot/model-v8.tar.gz" 
ENDPOINT_NAME = "taske-v8-final"
CONFIG_NAME = "taske-config-v8"
MODEL_NAME = "taske-model-v8"

# THE KEY FIX: Use the Official Inference Image (Not Training)
INFERENCE_IMAGE = "763104351884.dkr.ecr.us-east-1.amazonaws.com/tensorflow-inference:2.11.0-cpu-py39"

s3 = boto3.client('s3')
sm = boto3.client('sagemaker')

def deploy_final():
    print(f"STARTING FINAL DEPLOYMENT: {ENDPOINT_NAME}")

    # 1. Download the Brain (Original Trained Model)
    print("Downloading original trained model...")
    response = sm.describe_training_job(TrainingJobName=SUCCESSFUL_JOB_NAME)
    artifact_url = response['ModelArtifacts']['S3ModelArtifacts']
    old_key = artifact_url.replace(f"s3://{BUCKET}/", "")
    s3.download_file(BUCKET, old_key, "original_model.tar.gz")
    
    # 2. Package the Brain + Logic
    print(" Re-packaging with requirements.txt...")
    if os.path.exists("temp_build"): shutil.rmtree("temp_build")
    os.makedirs("temp_build/code", exist_ok=True)
    
    # Extract original model (the .pb files)
    with tarfile.open("original_model.tar.gz", "r:gz") as tar:
        tar.extractall("temp_build")
        
    # Copy inference logic
    shutil.copy("sagemaker_source/inference.py", "temp_build/code/inference.py")
    
    # Copy requirements (Force TF 2.11.0)
    if os.path.exists("sagemaker_source/requirements.txt"):
        shutil.copy("sagemaker_source/requirements.txt", "temp_build/code/requirements.txt")
        print("   - Added requirements.txt")
    else:
        print("WARNING: requirements.txt not found! (This might fail)")
    
    # Create new tarball
    with tarfile.open("fixed_model.tar.gz", "w:gz") as tar:
        tar.add("temp_build", arcname=".")
        
    # 3. Upload to S3
    print(f"Uploading v8 model to {MODEL_KEY}...")
    s3.upload_file("fixed_model.tar.gz", BUCKET, MODEL_KEY)
    
    # 4. Create SageMaker Model
    print(f"Creating Model Registry: {MODEL_NAME}...")
    model_url = f"s3://{BUCKET}/{MODEL_KEY}"
    
    try: sm.delete_model(ModelName=MODEL_NAME)
    except: pass
    
    sm.create_model(
        ModelName=MODEL_NAME,
        PrimaryContainer={
            'Image': INFERENCE_IMAGE,
            'ModelDataUrl': model_url,
            'Environment': {
                'SAGEMAKER_PROGRAM': 'inference.py',
                'SAGEMAKER_SUBMIT_DIRECTORY': '/opt/ml/model/code',
                'SAGEMAKER_REGION': 'us-east-1'
            }
        },
        ExecutionRoleArn=response['RoleArn']
    )

    # 5. Create Configuration
    print(f"Creating Config: {CONFIG_NAME}...")
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

    # 6. Launch Endpoint
    print(f"Creating Endpoint: {ENDPOINT_NAME} (Wait 5-8 mins)...")
    try:
        sm.create_endpoint(
            EndpointName=ENDPOINT_NAME,
            EndpointConfigName=CONFIG_NAME
        )
        print("CREATION STARTED! Go delete the old broken ones now.")
    except Exception as e:
        print(f"Error creating endpoint: {e}")

if __name__ == "__main__":
    deploy_final()
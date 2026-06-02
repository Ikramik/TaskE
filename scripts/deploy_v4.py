import boto3
import tarfile
import os
import shutil
import time

# --- CONFIGURATION ---
SUCCESSFUL_JOB_NAME = "tensorflow-training-2025-12-10-19-53-26-592"
BUCKET = "taske-training-data"
MODEL_KEY = "models/taskbot/model-v4.tar.gz"  # New filename to avoid conflicts
ENDPOINT_NAME = "taske-v4"                    # NEW ENDPOINT NAME
CONFIG_NAME = "taske-config-v4"
MODEL_NAME = "taske-model-v4"

s3 = boto3.client('s3')
sm = boto3.client('sagemaker')

def deploy_v4():
    print(f" STARTING DEPLOYMENT of {ENDPOINT_NAME}...")

    # 1. Get the Old Working Model Artifact
    print("  Downloading original trained model...")
    response = sm.describe_training_job(TrainingJobName=SUCCESSFUL_JOB_NAME)
    artifact_url = response['ModelArtifacts']['S3ModelArtifacts']
    
    # Parse S3 URL
    old_key = artifact_url.replace(f"s3://{BUCKET}/", "")
    s3.download_file(BUCKET, old_key, "original_model.tar.gz")
    
    # 2. Extract and Add Code
    print("Re-packaging: Model + Inference Code...")
    if os.path.exists("temp_build"): shutil.rmtree("temp_build")
    os.makedirs("temp_build/code", exist_ok=True)
    
    # Extract model
    with tarfile.open("original_model.tar.gz", "r:gz") as tar:
        tar.extractall("temp_build")
        
    # Copy our fixed inference script into 'code/'
    # Ensure source exists
    if not os.path.exists("sagemaker_source/inference.py"):
        raise Exception(" Could not find sagemaker_source/inference.py")
        
    shutil.copy("sagemaker_source/inference.py", "temp_build/code/inference.py")
    
    # Create new tarball
    with tarfile.open("fixed_model.tar.gz", "w:gz") as tar:
        tar.add("temp_build", arcname=".")
        
    # 3. Upload Fixed Model
    print(f"  Uploading v4 model to {MODEL_KEY}...")
    s3.upload_file("fixed_model.tar.gz", BUCKET, MODEL_KEY)
    
    # 4. Create New Model Definition
    print(f"Creating Model: {MODEL_NAME}...")
    model_url = f"s3://{BUCKET}/{MODEL_KEY}"
    
    try: sm.delete_model(ModelName=MODEL_NAME)
    except: pass
    
    sm.create_model(
        ModelName=MODEL_NAME,
        PrimaryContainer={
            'Image': response['AlgorithmSpecification']['TrainingImage'],
            'ModelDataUrl': model_url,
            'Environment': {
                'SAGEMAKER_PROGRAM': 'inference.py',
                'SAGEMAKER_SUBMIT_DIRECTORY': '/opt/ml/model/code',
                'SAGEMAKER_REGION': 'us-east-1'
            }
        },
        ExecutionRoleArn=response['RoleArn']
    )

    # 5. Create New Endpoint Config
    print(f" Creating Config: {CONFIG_NAME}...")
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

    # 6. Create Endpoint
    print(f"Creating Endpoint: {ENDPOINT_NAME} (Wait 5-8 mins)...")
    try:
        sm.create_endpoint(
            EndpointName=ENDPOINT_NAME,
            EndpointConfigName=CONFIG_NAME
        )
        print("CREATION STARTED!")
    except Exception as e:
        print(f" Error creating endpoint: {e}")

if __name__ == "__main__":
    deploy_v4()
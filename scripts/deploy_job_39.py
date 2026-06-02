import boto3
import time
import sys

# --- CONFIGURATION ---
TRAINING_JOB_NAME = "credit-burn-job-39" 
ENDPOINT_NAME = "taske-v9-smart-brain"
REGION = 'us-east-1'
INSTANCE_TYPE = 'ml.m4.xlarge' 

# FIX: This is the correct image for SERVING (not training)
# TensorFlow 2.13 Inference (CPU)
INFERENCE_IMAGE_URI = "763104351884.dkr.ecr.us-east-1.amazonaws.com/tensorflow-inference:2.13.0-cpu"

def force_deploy():
    session = boto3.Session(region_name=REGION)
    sm = session.client('sagemaker')

    print(f"STARTING FORCE DEPLOY for Job: {TRAINING_JOB_NAME}")

    # --- 1. CLEANUP PHASE (Delete EVERYTHING old) ---
    print("\n[1/4] Cleaning up old artifacts...")
    
    # Delete Endpoint
    try:
        sm.delete_endpoint(EndpointName=ENDPOINT_NAME)
        print(f"   - Deleted old endpoint: {ENDPOINT_NAME}")
        time.sleep(15) 
    except:
        print(f"   - Endpoint {ENDPOINT_NAME} did not exist.")

    # Delete Config
    try:
        sm.delete_endpoint_config(EndpointConfigName=ENDPOINT_NAME + "-config")
        print(f"   - Deleted old config: {ENDPOINT_NAME}-config")
    except:
        print(f"   - Config did not exist.")

    # Delete Model
    try:
        sm.delete_model(ModelName=TRAINING_JOB_NAME + "-model")
        print(f"   - Deleted old model object: {TRAINING_JOB_NAME}-model")
    except:
        print(f"   - Model object did not exist.")

    # --- 2. PREPARATION PHASE (THE FIX IS HERE) ---
    print("\n[2/4] Fetching training details...")
    try:
        response = sm.describe_training_job(TrainingJobName=TRAINING_JOB_NAME)
        model_data_url = response['ModelArtifacts']['S3ModelArtifacts']
        role_arn = response['RoleArn']
        
        # STOP: We do NOT use response['AlgorithmSpecification']['TrainingImage']
        # We use our hardcoded INFERENCE image.
        image_uri = INFERENCE_IMAGE_URI
        
        print(f"   - Model Artifact: {model_data_url}")
        print(f"   - USING CORRECT IMAGE: {image_uri}")
        
    except Exception as e:
        print(f"FATAL: Could not find training job. {e}")
        return

    # --- 3. CREATION PHASE ---
    print("\n[3/4] Rebuilding everything fresh...")
    
    # Create Model
    model_name = TRAINING_JOB_NAME + "-model"
    sm.create_model(
        ModelName=model_name,
        PrimaryContainer={
            'Image': image_uri,
            'ModelDataUrl': model_data_url
        },
        ExecutionRoleArn=role_arn
    )
    print(f"Created Model: {model_name}")

    # Create Config
    config_name = ENDPOINT_NAME + "-config"
    sm.create_endpoint_config(
        EndpointConfigName=config_name,
        ProductionVariants=[{
            'InstanceType': INSTANCE_TYPE,
            'InitialInstanceCount': 1,
            'ModelName': model_name,
            'VariantName': 'AllTraffic'
        }]
    )
    print(f"Created Config: {config_name}")

    # --- 4. DEPLOYMENT PHASE ---
    print("\n[4/4] Launching Endpoint...")
    sm.create_endpoint(
        EndpointName=ENDPOINT_NAME,
        EndpointConfigName=config_name
    )
    print(f"SUCCESS! Endpoint {ENDPOINT_NAME} is launching.")
    print("Go to SageMaker Console and wait 5-10 mins for 'InService'.")

if __name__ == "__main__":
    force_deploy()
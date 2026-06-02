# emergency_stop.py - FIXED VERSION
import boto3

sagemaker = boto3.client('sagemaker', region_name='us-east-1')

print("🚨 EMERGENCY STOP - Stopping ALL SageMaker resources...")

# 1. Stop ALL endpoints
try:
    endpoints = sagemaker.list_endpoints()
    if 'Endpoints' in endpoints:
        for ep in endpoints['Endpoints']:
            print(f"🗑️  Deleting endpoint: {ep['EndpointName']}")
            try:
                sagemaker.delete_endpoint(EndpointName=ep['EndpointName'])
            except Exception as e:
                print(f"   ⚠️  Could not delete {ep['EndpointName']}: {e}")
    else:
        print("✅ No endpoints found")
except Exception as e:
    print(f"⚠️  Error listing endpoints: {e}")

# 2. Delete ALL endpoint configs (use try-except)
try:
    configs = sagemaker.list_endpoint_configs()
    if 'EndpointConfigSummaries' in configs:
        for cfg in configs['EndpointConfigSummaries']:
            print(f"🗑️  Deleting config: {cfg['EndpointConfigName']}")
            try:
                sagemaker.delete_endpoint_config(EndpointConfigName=cfg['EndpointConfigName'])
            except Exception as e:
                print(f"   ⚠️  Could not delete config: {e}")
    else:
        print("✅ No endpoint configs found")
except Exception as e:
    print(f"⚠️  Error listing configs: {e}")

# 3. Also stop any running training jobs (optional but saves credits)
try:
    training_jobs = sagemaker.list_training_jobs(StatusEquals='InProgress')
    if 'TrainingJobSummaries' in training_jobs:
        for job in training_jobs['TrainingJobSummaries']:
            print(f"🛑 Stopping training job: {job['TrainingJobName']}")
            sagemaker.stop_training_job(TrainingJobName=job['TrainingJobName'])
except Exception as e:
    print(f"⚠️  Error checking training jobs: {e}")

print("\n✅ Emergency stop completed!")
print("💰 You just saved ~$1.10/day per stopped endpoint")
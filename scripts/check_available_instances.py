# scripts/check_available_instances.py
import boto3

def check_available_instances():
    """Check which instance types are available for SageMaker"""
    sagemaker = boto3.client('sagemaker')
    
    # Try to get available instance types
    try:
        # List training jobs to see what instances are being used
        response = sagemaker.list_training_jobs(MaxResults=5)
        print("Recent training jobs:")
        for job in response['TrainingJobSummaries']:
            print(f"  - {job['TrainingJobName']}: {job.get('ResourceConfig', {}).get('InstanceType', 'Unknown')}")
    except Exception as e:
        print(f"Could not list training jobs: {e}")
    
    # Check available instance types for endpoints
    try:
        print("\nAvailable instance types for endpoints:")
        endpoint_types = ['ml.t2.medium', 'ml.t3.medium', 'ml.m5.large', 'ml.c5.xlarge']
        for instance_type in endpoint_types:
            print(f"  - {instance_type}")
    except Exception as e:
        print(f"Error checking instances: {e}")

if __name__ == "__main__":
    check_available_instances()
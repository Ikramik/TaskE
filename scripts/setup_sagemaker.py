import boto3
import json
import os
import subprocess
import sys

def check_aws_setup():
    """Check if AWS is properly configured"""
    print("Checking AWS setup...")
    
    try:
        # Test boto3
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print(f" AWS Credentials Verified!")
        print(f"   Account ID: {identity['Account']}")
        print(f"   User ARN: {identity['Arn']}")
        return identity['Account']
        
    except Exception as e:
        print(f" AWS Credentials Error: {e}")
        print("\n To set up AWS credentials:")
        print("1. Get your AWS Access Key and Secret Key from AWS Console")
        print("2. Run this in PowerShell: aws configure")
        print("3. Or create ~/.aws/credentials file with:")
        print("""
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
region = us-east-1
""")
        return None

def create_sagemaker_role(account_id):
    """Create SageMaker execution role"""
    print(f"\n Creating SageMaker execution role...")
    
    # Trust policy for SageMaker
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "sagemaker.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    
    role_name = 'TaskE-SageMaker-ExecutionRole'
    
    try:
        iam = boto3.client('iam')
        
        # Check if role exists
        try:
            response = iam.get_role(RoleName=role_name)
            role_arn = response['Role']['Arn']
            print(f"Role already exists: {role_arn}")
            
        except iam.exceptions.NoSuchEntityException:
            # Create the role
            print(f" Creating new IAM role: {role_name}...")
            response = iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Role for TaskE SageMaker training',
                Tags=[
                    {'Key': 'Project', 'Value': 'TaskE'},
                    {'Key': 'Owner', 'Value': 'Ikram'}
                ]
            )
            role_arn = response['Role']['Arn']
            print(f" Created role: {role_arn}")
        
        # Attach necessary policies
        policies = [
            'arn:aws:iam::aws:policy/AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess', 
            'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
        ]
        
        for policy in policies:
            try:
                iam.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn=policy
                )
                print(f" Attached policy: {policy}")
            except Exception as e:
                print(f"  Could not attach {policy}: {e}")

        return role_arn
        
    except Exception as e:
        print(f" Error creating role: {e}")
        return None

def check_s3_data():
    """Verify training data exists in S3"""
    print(f"\n Checking S3 training data...")
    
    try:
        s3 = boto3.client('s3')
        bucket_name = 'taske-training-data'
        
        # Check if bucket exists
        try:
            s3.head_bucket(Bucket=bucket_name)
            print(f" S3 bucket exists: {bucket_name}")
        except:
            print(f" S3 bucket not found: {bucket_name}")
            return False
        
        # Check if training data exists
        training_key = 'training/taskbot/v1/training_data.json'
        try:
            s3.head_object(Bucket=bucket_name, Key=training_key)
            print(f" Training data exists: s3://{bucket_name}/{training_key}")
            return True
        except:
            print(f" Training data not found: s3://{bucket_name}/{training_key}")
            return False
            
    except Exception as e:
        print(f" Error checking S3: {e}")
        return False

def update_training_script(role_arn):
    """Update sagemaker_train.py with correct role ARN"""
    print(f"\n Updating training script...")
    
    try:
        script_path = 'scripts/sagemaker_train.py'
        
        with open(script_path, 'r') as f:
            content = f.read()
        
        # Find and replace any role assignment line
        lines = content.split('\n')
        updated = False
        
        for i, line in enumerate(lines):
            if 'role = ' in line and ('arn:aws:iam' in line or 'get_execution_role' in line):
                lines[i] = f"    role = '{role_arn}'"
                updated = True
                break
        
        # If no role line found, add it after the bucket definitions
        if not updated:
            for i, line in enumerate(lines):
                if 'OUTPUT_PATH = ' in line:
                    lines.insert(i + 1, f"    role = '{role_arn}'")
                    updated = True
                    break
        
        with open(script_path, 'w') as f:
            f.write('\n'.join(lines))
            
        print(" Updated sagemaker_train.py with correct role ARN")
        return True
        
    except Exception as e:
        print(f"  Could not update sagemaker_train.py: {e}")
        return False

def upload_training_data():
    """Upload training data to S3 if needed"""
    print(f"\n Uploading training data to S3...")
    
    try:
        # Run the upload script
        result = subprocess.run([
            sys.executable, 'scripts/upload_to_s3.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(" Training data uploaded successfully")
            return True
        else:
            print(f" Upload failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f" Error uploading data: {e}")
        return False

def main():
    print(" TaskE SageMaker Setup")
    print("=" * 50)
    
    # Step 1: Check AWS setup
    account_id = check_aws_setup()
    if not account_id:
        return
    
    # Step 2: Create SageMaker role
    role_arn = create_sagemaker_role(account_id)
    if not role_arn:
        return
    
    # Step 3: Update training script
    if not update_training_script(role_arn):
        return
    
    # Step 4: Check/upload training data
    if not check_s3_data():
        print("\n Generating and uploading training data...")
        
        # Generate training data
        try:
            subprocess.run([sys.executable, 'scripts/generate_training_data.py'], check=True)
            print(" Training data generated")
        except:
            print(" Failed to generate training data")
            return
        
        # Upload to S3
        if not upload_training_data():
            return
    
    print("\n Setup Completed Successfully!")
    print("=" * 50)
    print(" Next steps:")
    print("1. Run: python scripts/sagemaker_train.py")
    print("2. This will train and deploy your model (takes 20-30 minutes)")
    print("3. Then create Lambda and API Gateway")
    print(f"\n Your SageMaker Role: {role_arn}")

if __name__ == "__main__":
    main()
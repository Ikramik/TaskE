import boto3
import json
import os
from botocore.exceptions import NoCredentialsError

def upload_to_s3():
    BUCKET_NAME = 'taske-training-data'
    
    try:
        # Create S3 client (uses AWS CLI configuration)
        s3 = boto3.client('s3', region_name='us-east-1')
        
        # Check if files exist
        if not os.path.exists('data/training_data.json'):
            print("❌ training_data.json not found. Run generate_training_data.py first.")
            return
        
        if not os.path.exists('data/intent_schema.json'):
            print("❌ intent_schema.json not found.")
            return
        
        # Upload training data
        s3.upload_file(
            'data/training_data.json',
            BUCKET_NAME,
            'training/taskbot/v1/training_data.json'
        )
        
        # Upload intent schema
        s3.upload_file(
            'data/intent_schema.json', 
            BUCKET_NAME,
            'training/taskbot/v1/intent_schema.json'
        )
        
        print("✅ Successfully uploaded files to S3")
        print(f"📁 Training data: s3://{BUCKET_NAME}/training/taskbot/v1/training_data.json")
        print(f"📁 Intent schema: s3://{BUCKET_NAME}/training/taskbot/v1/intent_schema.json")
        
    except NoCredentialsError:
        print("❌ AWS credentials not available. Run 'aws configure' first.")
    except Exception as e:
        print(f"❌ Error uploading to S3: {e}")

if __name__ == "__main__":
    upload_to_s3()
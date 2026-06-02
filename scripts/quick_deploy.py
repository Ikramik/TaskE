# quick_deploy.py
import boto3
from sagemaker.tensorflow import TensorFlowModel
import time

MODEL_PATH = "s3://taske-training-data/models/taskbot/tensorflow-training-2025-12-10-19-36-21-547/output/model.tar.gz"
ROLE = "arn:aws:iam::038462748981:role/service-role/AmazonSageMaker-ExecutionRole-20251114T213666"

print(" Deploying with FIXED configuration...")

# OPTION 1: Try different framework version
model = TensorFlowModel(
    model_data=MODEL_PATH,
    role=ROLE,
    framework_version='2.12',  # Changed from 2.13
    entry_point='inference.py',
    source_dir='scripts/sagemaker_source',
    py_version='py39'  # Changed from py310
)

# OPTION 2: Deploy WITHOUT wait, then check logs
predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.t2.medium',
    endpoint_name='taske-production-v2',
    wait=False  # Don't wait for health check
)

print(" Deployment initiated (not waiting)")
print(" Check CloudWatch logs in 5 minutes:")
print("   https://us-east-1.console.aws.amazon.com/cloudwatch/home")
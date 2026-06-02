
import boto3
import pandas as pd
from sagemaker import get_execution_role

# 1. minimal training data (20-30 examples)
training_data = [
    {"text": "add meeting at 3pm", "intent": "add_task", "time": "3pm"},
    {"text": "schedule gym session", "intent": "add_task", "time": null},
    {"text": "what are my tasks", "intent": "query_tasks"},
    {"text": "hello", "intent": "greeting"},
    {"text": "thanks", "intent": "thanks"}
]

# 2. Upload to S3
s3 = boto3.client('s3')
s3.put_object(Bucket='your-bucket', Key='training/data.json', Body=json.dumps(training_data))
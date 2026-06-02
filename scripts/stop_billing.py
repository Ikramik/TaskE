# Quick script to stop the old endpoint:
import boto3

sagemaker = boto3.client('sagemaker', region_name='us-east-1')

# List all endpoints
response = sagemaker.list_endpoints()
for endpoint in response['Endpoints']:
    print(f"Endpoint: {endpoint['EndpointName']} - Status: {endpoint['EndpointStatus']}")
    
# Delete the old one
try:
    sagemaker.delete_endpoint(EndpointName='taske-intent-classifier-v1')
    print("✅ Deleted old endpoint to stop billing")
except Exception as e:
    print(f"Error: {e}")
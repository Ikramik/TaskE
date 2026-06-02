import boto3
import json

# 1. Setup the client
client = boto3.client('sagemaker-runtime')

print(" Contacting TaskBot AI...")

try:
    # 2. Send the message
    response = client.invoke_endpoint(
        EndpointName='taske-v8-final',
        ContentType='application/json',
        Body=json.dumps({"instances": ["hello"]})
    )

    # 3. Read the answer
    result = response['Body'].read().decode('utf-8')
    print("\n RESPONSE FROM AI ")
    print(result)
    print("IT WORKS!")

except Exception as e:
    print(f"\n Error: {e}")
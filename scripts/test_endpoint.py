import boto3
import json

def test_sagemaker_endpoint_fixed():
    """Test endpoint with correct input format"""
    print(" Testing SageMaker Endpoint - FIXED VERSION")
    print("=" * 50)
    
    runtime = boto3.client('sagemaker-runtime', region_name='us-east-1')
    
    test_messages = [
        "add meeting at 3pm",
        "show my tasks for today",
        "hello",
        "delete the gym session",
        "add gym tomorrow at 5pm for 1 hour"
    ]
    
    # Try different input formats
    formats_to_try = [
        ('instances', {'instances': [{'data': msg}] for msg in test_messages}),
        ('instances-simple', {'instances': [msg] for msg in test_messages}),
        ('data', {'data': msg for msg in test_messages}),
        ('inputs', {'inputs': msg for msg in test_messages})
    ]
    
    for msg in test_messages:
        print(f"\nTesting: '{msg}'")
        
        # Try format 1: TensorFlow Serving format
        try:
            print("   Trying 'instances' format...")
            response = runtime.invoke_endpoint(
                EndpointName='taske-intent-classifier-v1',
                ContentType='application/json',
                Body=json.dumps({'instances': [{'data': msg}]})
            )
            result = json.loads(response['Body'].read().decode())
            print(f"  SUCCESS! Intent: {result.get('predictions', [{}])[0].get('intent', 'unknown')}")
            break
        except Exception as e1:
            print(f" Failed: {str(e1)[:100]}...")
        
        # Try format 2: Simple array
        try:
            print("   Trying simple array format...")
            response = runtime.invoke_endpoint(
                EndpointName='taske-intent-classifier-v1',
                ContentType='application/json', 
                Body=json.dumps({'instances': [msg]})
            )
            result = json.loads(response['Body'].read().decode())
            print(f"  SUCCESS! Result: {result}")
            break
        except Exception as e2:
            print(f"  Failed: {str(e2)[:100]}...")
    
    # Also check what the endpoint expects
    print("\n🔍 Checking endpoint configuration...")
    try:
        sagemaker = boto3.client('sagemaker', region_name='us-east-1')
        endpoint = sagemaker.describe_endpoint(EndpointName='taske-intent-classifier-v1')
        config_name = endpoint['EndpointConfigName']
        
        config = sagemaker.describe_endpoint_config(EndpointConfigName=config_name)
        model_name = config['ProductionVariants'][0]['ModelName']
        
        model = sagemaker.describe_model(ModelName=model_name)
        print(f"   Model: {model_name}")
        print(f"   Container: {model['PrimaryContainer'].get('Image', 'Unknown')}")
        print(f"   Environment: {model['PrimaryContainer'].get('Environment', {})}")
    except Exception as e:
        print(f" Could not get endpoint details: {e}")

if __name__ == "__main__":
    test_sagemaker_endpoint_fixed()
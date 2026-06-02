import json
import boto3
import os

def lambda_handler(event, context):
    """AWS Lambda function to proxy requests to SageMaker"""
    print("TaskE Lambda Handler - Processing request")
    
    try:
        # Parse the incoming request
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
        
        text = body.get('text', '').strip()
        
        if not text:
            print(" No text provided in request")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'No text provided'})
            }
        
        print(f" Processing text: {text[:50]}...")
        
        # Initialize SageMaker runtime client
        runtime = boto3.client('sagemaker-runtime', region_name='us-east-1')
        
        # Prepare the payload for SageMaker
        payload = {
            'instances': [{
                'text': text,
                'userId': body.get('userId', 'default')
            }]
        }
        
        # Call the SageMaker endpoint
        print(f" Calling SageMaker endpoint: taske-intent-classifier-v1")
        response = runtime.invoke_endpoint(
            EndpointName='taske-working-v1',
            ContentType='application/json',
            Body=json.dumps(payload)
        )
        
        # Parse the SageMaker response
        result = json.loads(response['Body'].read().decode())
        
        print(f" Prediction: {result.get('intent', 'unknown')} "
              f"(confidence: {result.get('confidence', 0):.2f})")
        
        # Return the response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
        
    except Exception as e:
        print(f" Error in Lambda handler: {str(e)}")
        
        # Return error response
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'intent': 'error',
                'confidence': 0,
                'response': 'I\'m having trouble processing your request.'
            })
        }
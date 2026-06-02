# create_zip.py - Save this in your lambda folder and run it
import zipfile
import os

# Create zip file
with zipfile.ZipFile('sagemaker_proxy.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipf.write('sagemaker_proxy.py', 'sagemaker_proxy.py')
    
print(f"Created sagemaker_proxy.zip")
print(f"File size: {os.path.getsize('sagemaker_proxy.zip')} bytes")

# Also verify the file exists
if os.path.exists('sagemaker_proxy.zip'):
    print("Zip file ready for AWS Lambda!")
else:
    print("Failed to create zip file")
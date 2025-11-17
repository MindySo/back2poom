# S3 Configuration Template
# Copy this file to config.py and fill in your actual credentials

S3_CONFIG = {
    'region_name': 'your-aws-region',        # e.g., 'ap-southeast-2'
    'bucket_name': 'your-s3-bucket-name',   # e.g., 'topoom-s3-bucket'
    'access_key_id': 'YOUR_ACCESS_KEY_ID',  # Your AWS Access Key ID
    'secret_access_key': 'YOUR_SECRET_KEY'  # Your AWS Secret Access Key
}

# GMS API Configuration (SSAFY AI API)
GMS_CONFIG = {
    'api_key': 'YOUR_GMS_API_KEY',  # e.g., 'S13P32A706-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    'base_url': 'https://gms.ssafy.io/gmsapi/api.openai.com/v1'
}
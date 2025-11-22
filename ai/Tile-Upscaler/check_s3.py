import boto3
from config import S3_CONFIG

# S3 클라이언트 생성
s3_client = boto3.client(
    's3',
    region_name=S3_CONFIG['region_name'],
    aws_access_key_id=S3_CONFIG['access_key_id'],
    aws_secret_access_key=S3_CONFIG['secret_access_key']
)

bucket_name = S3_CONFIG['bucket_name']

print(f"Checking S3 bucket: {bucket_name}\n")

# 버킷의 모든 객체 리스트
print("=== All objects in bucket ===")
try:
    response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=50)

    if 'Contents' in response:
        print(f"Found {len(response['Contents'])} objects:\n")
        for obj in response['Contents']:
            print(f"  - {obj['Key']} (Size: {obj['Size']} bytes)")
    else:
        print("No objects found in bucket")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Folders in INPUT/ ===")
try:
    response = s3_client.list_objects_v2(
        Bucket=bucket_name,
        Prefix='INPUT/',
        Delimiter='/'
    )

    if 'CommonPrefixes' in response:
        print(f"Found {len(response['CommonPrefixes'])} folders in INPUT/:\n")
        for prefix in response['CommonPrefixes']:
            folder_name = prefix['Prefix']
            print(f"  - {folder_name}")
    else:
        print("No folders found in INPUT/")

    # INPUT/ 내의 파일들도 확인
    if 'Contents' in response:
        print(f"\nFiles in INPUT/:")
        for obj in response['Contents']:
            print(f"  - {obj['Key']}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Folders in OUTPUT/ ===")
try:
    response = s3_client.list_objects_v2(
        Bucket=bucket_name,
        Prefix='OUTPUT/',
        Delimiter='/'
    )

    if 'CommonPrefixes' in response:
        print(f"Found {len(response['CommonPrefixes'])} folders in OUTPUT/:\n")
        for prefix in response['CommonPrefixes']:
            folder_name = prefix['Prefix']
            print(f"  - {folder_name}")
    else:
        print("No folders found in OUTPUT/")
except Exception as e:
    print(f"Error: {e}")

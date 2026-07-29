import os
import boto3
from botocore.config import Config

ENDPOINT_URL = "https://984e55700d5ab74893ff2cd768b58f8d.r2.cloudflarestorage.com"
ACCESS_KEY = "8f13bba1f98f1cd1a19ff57434c35340"
SECRET_KEY = "af607c4639be8cfcc18f062e540a609d80a05168ee006f4580e1dc732be6923d"
BUCKET_NAME = "tom-fox-music"

def get_s3_client():
    my_config = Config(retries={'max_attempts': 10, 'mode': 'standard'})
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
        config=my_config
    )

s3 = get_s3_client()

# List prefixes in root
resp = s3.list_objects_v2(Bucket=BUCKET_NAME, Delimiter='/')
if 'CommonPrefixes' in resp:
    print("Root directories:")
    for prefix in resp['CommonPrefixes']:
        print(" - " + prefix['Prefix'])
        
# List prefixes in audio/
print("\nAudio subdirectories:")
resp = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix='audio/', Delimiter='/')
if 'CommonPrefixes' in resp:
    for prefix in resp['CommonPrefixes']:
        print(" - " + prefix['Prefix'])

# List prefixes in assets/
print("\nAssets subdirectories:")
resp = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix='assets/', Delimiter='/')
if 'CommonPrefixes' in resp:
    for prefix in resp['CommonPrefixes']:
        print(" - " + prefix['Prefix'])

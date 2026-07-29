import os
import boto3
from botocore.config import Config
from supabase import create_client, Client

# R2 Configuration
ENDPOINT_URL = "https://984e55700d5ab74893ff2cd768b58f8d.r2.cloudflarestorage.com"
ACCESS_KEY = "8f13bba1f98f1cd1a19ff57434c35340"
SECRET_KEY = "af607c4639be8cfcc18f062e540a609d80a05168ee006f4580e1dc732be6923d"
BUCKET_NAME = "tom-fox-music"

# Supabase Configuration
SUPABASE_URL = "https://jicrumwdnwmjkotkbjtg.supabase.co"
SUPABASE_KEY = "sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_s3_client():
    my_config = Config(
        retries={'max_attempts': 10, 'mode': 'standard'}
    )
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
        config=my_config
    )

def list_all_objects(s3_client, prefix):
    objects = set()
    paginator = s3_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix)
    for page in pages:
        for obj in page.get('Contents', []):
            objects.add(obj['Key'].replace(prefix, ''))
    return objects

def main():
    s3_client = get_s3_client()
    
    wav_files = list_all_objects(s3_client, 'audio/hdaudio/wav/')
    aiff_files = list_all_objects(s3_client, 'audio/hdaudio/aiff/')
    
    db_tracks = []
    page = 0
    page_size = 1000
    while True:
        res = supabase.table('tracks').select('id, file_name, track_type').execute()
        if not res.data:
            break
        db_tracks.extend(res.data)
        if len(res.data) < page_size:
            break
        page += 1
        
    missing_wav = []
    missing_aiff = []
    
    for track in db_tracks:
        base_name = track['file_name'].rsplit('.', 1)[0]
        expected_wav = base_name + ".wav"
        expected_aiff = base_name + ".aiff"
        expected_aif = base_name + ".aif"
        
        has_wav = expected_wav in wav_files
        has_aiff = expected_aiff in aiff_files or expected_aif in aiff_files
        
        if not has_wav:
            missing_wav.append(base_name)
        if not has_aiff:
            missing_aiff.append(base_name)
            
    print(f"Total WAV in R2: {len(wav_files)}")
    print(f"Total AIFF in R2: {len(aiff_files)}")
    print(f"Tracks missing WAV: {len(missing_wav)}")
    print(f"Tracks missing AIFF: {len(missing_aiff)}")
    
    with open("missing_tracks.txt", "w") as f:
        for m in missing_wav:
            f.write(f"'{m}', ")
            
if __name__ == '__main__':
    main()

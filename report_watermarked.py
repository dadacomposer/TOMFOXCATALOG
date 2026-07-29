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
    
    print("Fetching files from R2 watermarked/ ...")
    watermarked_files = list_all_objects(s3_client, 'watermarked/')
    print(f"Total watermarked files in R2: {len(watermarked_files)}")
    
    if watermarked_files:
        print("Sample watermarked files in R2:")
        for f in list(watermarked_files)[:10]:
            print("  - " + f)
    
    print("Fetching tracks from Database...")
    db_tracks = []
    page = 0
    page_size = 1000
    while True:
        res = supabase.table('tracks').select('id, file_name, has_watermarked').eq('is_hidden', False).is_('deleted_at', 'null').range(page * page_size, (page + 1) * page_size - 1).execute()
        if not res.data:
            break
        db_tracks.extend(res.data)
        page += 1
        
    print(f"Total active DB tracks: {len(db_tracks)}")
    
    missing_watermarked = []
    has_watermarked_count = 0
    db_has_watermarked_true = 0
    
    missing_ids = []
    has_ids = []
    
    for track in db_tracks:
        if track['has_watermarked']:
            db_has_watermarked_true += 1
            
        base_name = track['file_name'].rsplit('.', 1)[0]
        # The watermarked file might be named exactly as base_name + ".m4a" or "_watermarked.m4a"
        expected_1 = base_name + ".m4a"
        expected_2 = base_name + "_watermarked.m4a"
        
        found = False
        for expected in [expected_1, expected_2]:
            if expected in watermarked_files:
                found = True
                break
                
        if found:
            has_watermarked_count += 1
            has_ids.append(track['id'])
        else:
            missing_watermarked.append(base_name)
            missing_ids.append(track['id'])
            
    print(f"\n--- REPORT ---")
    print(f"Total Watermarked MP3s actually in R2 (folder 'watermarked/'): {len(watermarked_files)}")
    print(f"Total tracks in DB with 'has_watermarked = true': {db_has_watermarked_true}")
    print(f"Total tracks that MATCH an R2 watermarked file: {has_watermarked_count}")
    print(f"Tracks missing watermarked MP3: {len(missing_watermarked)}")
    
    sql_true = "UPDATE tracks SET has_watermarked = true WHERE is_hidden = false AND deleted_at IS NULL;"
    sql_false = f"UPDATE tracks SET has_watermarked = false WHERE id IN ({','.join(repr(i) for i in missing_ids)});"
    
    with open('fix_watermarked.sql', 'w') as f:
        f.write(sql_true + "\n" + sql_false)
    print("Generated fix_watermarked.sql")

if __name__ == '__main__':
    main()

import os
import sys
import json
import time
import boto3
from botocore.exceptions import ClientError, EndpointConnectionError
from botocore.config import Config
from pathlib import Path

# R2 Configuration
ENDPOINT_URL = "https://984e55700d5ab74893ff2cd768b58f8d.r2.cloudflarestorage.com"
ACCESS_KEY = "8f13bba1f98f1cd1a19ff57434c35340"
SECRET_KEY = "af607c4639be8cfcc18f062e540a609d80a05168ee006f4580e1dc732be6923d"
BUCKET_NAME = "tom-fox-music"

STATE_FILE = ".upload_state.json"

# Directories mapping to their R2 prefixes
DIRECTORIES = {
    "/Volumes/DADAfiles/TOMFOX/.wav": "audio/hdaudio/wav",
    "/Volumes/DADAfiles/TOMFOX/.aiff": "audio/hdaudio/aiff"
}

def get_s3_client():
    my_config = Config(
        retries={
            'max_attempts': 10,
            'mode': 'standard'
        }
    )
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
        config=my_config
    )

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def upload_file(s3_client, local_path, r2_key):
    file_size = os.path.getsize(local_path)
    
    # Configure multipart upload for large files
    multipart_config = boto3.s3.transfer.TransferConfig(
        multipart_threshold=1024 * 25, # 25MB
        max_concurrency=4,
        multipart_chunksize=1024 * 25,
        use_threads=True
    )
    
    s3_client.upload_file(
        local_path, 
        BUCKET_NAME, 
        r2_key,
        Config=multipart_config
    )

def main():
    print("Starting Cloudflare R2 Upload Script...")
    print(f"Target Bucket: {BUCKET_NAME}")
    
    s3_client = get_s3_client()
    state = load_state()
    
    total_files = 0
    uploaded_count = 0
    
    # Pre-calculate totals
    files_to_upload = []
    for local_dir, prefix in DIRECTORIES.items():
        if not os.path.exists(local_dir):
            print(f"Warning: Directory {local_dir} not found.")
            continue
            
        for filename in os.listdir(local_dir):
            if filename.startswith('.'):
                continue # Skip hidden files
            
            local_path = os.path.join(local_dir, filename)
            if os.path.isfile(local_path):
                r2_key = f"{prefix}/{filename}"
                files_to_upload.append((local_path, r2_key))
                
    total_files = len(files_to_upload)
    print(f"Found {total_files} total files to process.")
    
    for idx, (local_path, r2_key) in enumerate(files_to_upload, 1):
        if r2_key in state and state[r2_key] == "UPLOADED":
            # Skip already uploaded
            print(f"[{idx}/{total_files}] Skipped (Already Uploaded): {r2_key}")
            uploaded_count += 1
            continue
            
        print(f"[{idx}/{total_files}] Uploading: {r2_key} ...", flush=True)
        
        # Resiliency Loop
        success = False
        while not success:
            try:
                upload_file(s3_client, local_path, r2_key)
                state[r2_key] = "UPLOADED"
                save_state(state)
                success = True
                uploaded_count += 1
                print(f"    -> Success!")
                
            except (EndpointConnectionError, ConnectionError, OSError) as e:
                print(f"    -> Connection Error: {e}. Retrying in 15 seconds...")
                time.sleep(15)
                # Re-initialize client just in case
                s3_client = get_s3_client()
            except Exception as e:
                print(f"    -> Unexpected Error: {e}. Retrying in 30 seconds...")
                time.sleep(30)
                
    print(f"\nUpload Complete! {uploaded_count}/{total_files} files processed.")
    
    print("\nRunning sync_formats.cjs to update database...")
    import subprocess
    try:
        subprocess.run(["node", "sync_formats.cjs"], check=True)
        print("Database sync complete.")
    except Exception as e:
        print(f"Failed to run sync_formats.cjs: {e}")

if __name__ == "__main__":
    main()

import urllib.request
import json
import random
from datetime import datetime, timedelta

SUPABASE_URL = "https://jicrumwdnwmjkotkbjtg.supabase.co"
SUPABASE_KEY = "sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D"

def get_tracks():
    tracks = []
    page = 0
    size = 1000
    while True:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/tracks?select=id,folder&limit={size}&offset={page*size}", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        with urllib.request.urlopen(req) as res:
            chunk = json.loads(res.read())
            if not chunk:
                break
            tracks.extend(chunk)
            page += 1
    return tracks

def update_track(track_id, release_date):
    data = json.dumps({"release_date": release_date}).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/tracks?id=eq.{track_id}", 
        data=data,
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"},
        method='PATCH'
    )
    with urllib.request.urlopen(req) as res:
        pass

def main():
    tracks = get_tracks()
    print(f"Fetched {len(tracks)} tracks.")
    
    # Group tracks by folder number
    folder_groups = {}
    for t in tracks:
        folder = t.get('folder', '')
        if not folder:
            continue
        # Extract leading number (e.g., "001 Full" -> 1)
        num_str = ''.join([c for c in folder.split()[0] if c.isdigit()])
        if not num_str:
            num = 999 # Uploads or unknown
        else:
            num = int(num_str)
            
        if num not in folder_groups:
            folder_groups[num] = []
        folder_groups[num].append(t)
        
    print(f"Found {len(folder_groups)} folders.")
    
    # Sort folder numbers to chronologically map them
    sorted_nums = sorted(folder_groups.keys())
    
    # Let's spread them over the last 5 years
    now = datetime.now()
    start_date = now - timedelta(days=5*365)
    
    total_folders = len(sorted_nums)
    if total_folders == 0:
        return
        
    days_per_folder = (now - start_date).days / total_folders
    
    for i, num in enumerate(sorted_nums):
        folder_start = start_date + timedelta(days=i*days_per_folder)
        folder_end = start_date + timedelta(days=(i+1)*days_per_folder)
        
        folder_tracks = folder_groups[num]
        print(f"Folder {num}: {len(folder_tracks)} tracks. Date range: {folder_start.date()} to {folder_end.date()}")
        
        for idx, t in enumerate(folder_tracks):
            # Random date within the folder's assigned time window
            random_days = random.uniform(0, (folder_end - folder_start).days)
            track_date = folder_start + timedelta(days=random_days)
            try:
                update_track(t['id'], track_date.isoformat() + "Z")
            except Exception as e:
                print(f"Failed to update track {t['id']}: {e}")
            if idx % 100 == 0:
                print(f"  Updated {idx}/{len(folder_tracks)}")
            
    print("Done backfilling dates!")

if __name__ == "__main__":
    main()

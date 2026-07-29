import urllib.request
import json
import os
import time
from google import genai
from google.genai import types

# Config
SUPABASE_URL = "https://jicrumwdnwmjkotkbjtg.supabase.co"
SUPABASE_KEY = "sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LOCAL_COMPRESSED_DIR = "/Volumes/DADAfiles/TOMFOX/Compressed"

# Initialize the NEW SDK client
client = genai.Client(api_key=GEMINI_API_KEY)

def get_test_tracks(limit=5):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/tracks?select=id,file_name,folder&limit={limit}&order=id.desc", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

def update_track_tags(track_id, tags_json):
    data = {
        "subgenre": tags_json.get("subgenre", []),
        "moods": tags_json.get("moods", []),
        "instruments": tags_json.get("instruments", []),
        "textures": tags_json.get("textures", []),
        "scenarios": tags_json.get("scenarios", []),
        "human_tags": tags_json.get("human_tags", []),
        "genre": tags_json.get("genre", ""),
        "description": tags_json.get("description", "")
    }
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/tracks?id=eq.{track_id}", 
        data=json.dumps(data).encode('utf-8'),
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"},
        method='PATCH'
    )
    with urllib.request.urlopen(req) as res:
        pass

def process_track(track):
    track_id = track['id']
    folder = track['folder']
    file_name = track['file_name']
    
    # Deriving MP3 path
    base_name = os.path.splitext(file_name)[0]
    mp3_name = f"{base_name}.mp3"
    mp3_path = os.path.join(LOCAL_COMPRESSED_DIR, folder, mp3_name)
    
    if not os.path.exists(mp3_path):
        print(f"Skipping {file_name}: MP3 not found at {mp3_path}")
        return
        
    print(f"\nProcessing: {mp3_name}")
    
    # Upload to Gemini directly using the new SDK
    print("Uploading to Gemini...")
    audio_file = client.files.upload(file=mp3_path)
    
    while audio_file.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(2)
        audio_file = client.files.get(name=audio_file.name)
        
    if audio_file.state.name == "FAILED":
        print(" Gemini failed to process the audio file.")
        return
        
    print(" Uploaded & Processed by Google!")
    
    prompt = """
    You are an expert music supervisor and audio tagger for a premium production music library.
    Actively listen to the provided audio track. Even if the track is long, focus your analysis on the first 3 minutes.
    Provide an extremely precise, highly specific, and non-redundant set of tags. Do not give generic tags that apply to thousands of tracks.
    Listen actively and thoughtfully to each specific track so that every track receives highly customized tags. We do NOT want 1000 tracks to have the same tags. Be creative, distinct, and highly analytical.
    Return a strict JSON object with the following schema:
    - genre: (string) The main overarching genre (e.g. Cinematic, Electronic, Acoustic, Hip-Hop).
    - subgenre: (array of strings) Highly specific subgenres (e.g. "Dark Ambient", "Neo-Classical", "Boom Bap").
    - moods: (array of strings) The exact emotional states and feelings conveyed by the music.
    - instruments: (array of strings) The most prominent and defining instruments heard, specifically how they are played (e.g. "Felt Piano", "Spiccato Strings", "Distorted 808").
    - textures: (array of strings) The sonic qualities (e.g. ethereal, gritty, lo-fi, warm, lush, punchy).
    - scenarios: (array of strings) 3 to 5 highly specific use-case scenarios or projections of how this track could be used in film/commercials (e.g. "Romantic dinner at sunset", "Tense interrogation scene", "High-speed car chase in the rain"). Be extremely creative and descriptive.
    - energy_level: (string) "Low", "Medium", or "High".
    - human_tags: (array of strings) Other relevant comma-separated tags (like tempo feelings, era, specific styles, cultural vibes).
    - description: (string) A rich, evocative 2-3 sentence narrative description of the track combining all elements above. This description is CRITICAL as it will be used by our vector AI to match natural language semantic searches. Make it highly descriptive of the audio's unique character.
    
    Respond ONLY with valid JSON matching this structure.
    """
    
    print("Analyzing with Gemini...")
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents=[audio_file, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        )
    )
    
    try:
        tags = json.loads(response.text)
        print("Generated Tags:")
        print(json.dumps(tags, indent=2))
        update_track_tags(track_id, tags)
        print("-> Updated in database.")
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        print("Raw response:", response.text)
        
    # Cleanup
    client.files.delete(name=audio_file.name)

if __name__ == "__main__":
    tracks = get_test_tracks(5)
    for t in tracks:
        process_track(t)

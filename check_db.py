import urllib.request, json
SUPABASE_URL = "https://jicrumwdnwmjkotkbjtg.supabase.co"
SUPABASE_KEY = "sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D"
req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/tracks?select=id,file_name,folder&limit=5", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
with urllib.request.urlopen(req) as res: print(json.dumps(json.loads(res.read()), indent=2))

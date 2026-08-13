import os
import re

directories = ['src/components', 'src/components/admin', 'src/components/studio', 'src/components/shared']

def process_file(path):
    with open(path, 'r') as file:
        content = file.read()

    new_content = content.replace('animate-slide-in-up', 'animate-scale-in')
    new_content = new_content.replace('animate-fade-in-up', 'animate-scale-in')
    
    def add_fade(match):
        s = match.group(0)
        if 'animate-fade-in' not in s and 'animate-scale-in' not in s:
            return s.replace('fixed inset-0', 'fixed inset-0 animate-fade-in')
        return s
    new_content = re.sub(r'<div[^>]*className="[^"]*fixed inset-0[^"]*"[^>]*>', add_fade, new_content)
    
    def add_scale(match):
        s = match.group(0)
        if 'animate-' not in s and 'fixed' not in s and 'absolute' not in s and ('shadow-xl' in s or 'shadow-2xl' in s or 'shadow-lg' in s or 'p-6' in s or 'p-8' in s):
            if 'className="' in s:
                return s.replace('className="', 'className="animate-scale-in ')
        return s
        
    new_content = re.sub(r'<div[^>]*className="[^"]*bg-white[^"]*rounded-[^"]*"[^>]*>', add_scale, new_content)

    if content != new_content:
        with open(path, 'w') as file:
            file.write(new_content)
        print(f"Updated {path}")

for d in directories:
    if not os.path.exists(d):
        continue
    for f in os.listdir(d):
        if not f.endswith('.tsx'):
            continue
        # ONLY apply to Modals to prevent lag on normal page components!
        if 'Modal' in f:
            path = os.path.join(d, f)
            process_file(path)

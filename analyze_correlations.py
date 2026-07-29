import os
import re
import difflib
from collections import defaultdict
import json

ORIGINALS_DIR = '/Volumes/DADAfiles/TOMFOX/originals'
REPORT_PATH = '/Volumes/DADAfiles/TOMFOX/report_correlazioni.md'

def get_all_files(directory):
    file_list = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if not file.startswith('.') and (file.lower().endswith('.mp3') or file.lower().endswith('.wav')):
                file_list.append(file)
    return file_list

def normalize_name(name):
    # Remove extension
    name = os.path.splitext(name)[0]
    # Lowercase
    name = name.lower()
    # Remove common tags like (demo), (version 2), etc to find the core name? 
    # Actually, we want to cluster them, so keeping the full name for comparison is fine,
    # but maybe we can strip special characters
    name = re.sub(r'[^a-z0-9]', ' ', name)
    # Remove extra spaces
    name = ' '.join(name.split())
    return name

def main():
    print("Scansionando la directory originals...")
    files = get_all_files(ORIGINALS_DIR)
    print(f"Trovati {len(files)} file.")

    # Remove duplicates if any files have the exact same name in different folders
    unique_files = list(set(files))
    
    clusters = []
    visited = set()

    print("Calcolando le correlazioni...")
    # This is O(n^2) but n=~2500 so it's around 3M iterations, very fast in Python.
    for i, file1 in enumerate(unique_files):
        if file1 in visited:
            continue
            
        current_cluster = [file1]
        visited.add(file1)
        
        name1 = os.path.splitext(file1)[0].lower()
        norm1 = normalize_name(file1)
        
        for j in range(i + 1, len(unique_files)):
            file2 = unique_files[j]
            if file2 in visited:
                continue
                
            name2 = os.path.splitext(file2)[0].lower()
            norm2 = normalize_name(file2)
            
            # Criteria for correlation:
            # 1. One is a direct substring of the other (e.g. "Song" and "Song (Demo)")
            # 2. High similarity ratio (e.g. > 0.85) to catch typos
            
            is_correlated = False
            
            # Substring check with word boundaries to avoid false positives like "car" and "carpet"
            # We'll just check if norm1 is in norm2 or vice versa
            if len(norm1) >= 5 and len(norm2) >= 5:
                if (norm1 in norm2) or (norm2 in norm1):
                    # To avoid "the" matching "there", we can check if it's a substantial part
                    if len(norm1) > 7 or len(norm2) > 7:
                        is_correlated = True
            
            if not is_correlated:
                ratio = difflib.SequenceMatcher(None, norm1, norm2).ratio()
                if ratio > 0.85:
                    is_correlated = True
                    
            if is_correlated:
                current_cluster.append(file2)
                visited.add(file2)
                
        if len(current_cluster) > 1:
            clusters.append(current_cluster)

    # Sort clusters by size
    clusters.sort(key=len, reverse=True)

    print(f"Trovati {len(clusters)} gruppi di file correlati.")
    print(f"Scrivendo il report in {REPORT_PATH}...")
    
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write("# Report Correlazioni File Originali\n\n")
        f.write("Questo report raggruppa i file trovati in `originals` che potrebbero essere correlati (versioni alternative, stems, demo, errori di battitura).\n\n")
        
        for i, cluster in enumerate(clusters, 1):
            f.write(f"### Gruppo {i}\n")
            for item in sorted(cluster):
                f.write(f"- {item}\n")
            f.write("\n")

    print("Completato!")

if __name__ == '__main__':
    main()

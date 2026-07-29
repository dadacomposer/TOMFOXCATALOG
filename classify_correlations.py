import os
import re

REPORT_PATH = '/Volumes/DADAfiles/TOMFOX/report_correlazioni.md'
OUTPUT_PATH = '/Volumes/DADAfiles/TOMFOX/report_classificazione_tracce.md'

STEM_KEYWORDS = [
    'drum', 'bass', 'piano', 'string', 'synth', 'vocal', 'horn', 'brass', 
    'percussion', 'sfx', 'organ', 'cello', 'marimba', 'arp', 'texture', 
    'pad', 'melody', 'guitar', 'choir', 'choral', 'glockenspiel', 'keys'
]

VERSION_KEYWORDS = [
    'demo', 'version', 'mix', 'extended', 'short', 'long', 'alt', ' b', ' c', ' d', ' e', ' f', 
    'ambient', 'creepy', 'atmospheric', 'faster', 'slower', 'vintage', 'solo', 
    'concept', 'variation', 'pt', 'part', 'sequence', 'rework', 'intro', 'outro', 'sting'
]

def classify_track(name, main_track):
    name_lower = name.lower()
    
    # If the name is basically just the main track with " B", " C", it's a version
    if re.search(r'\b[b-f]\b', name_lower) and not 'drum' in name_lower:
        pass # we'll catch it with VERSION_KEYWORDS or general logic

    for kw in STEM_KEYWORDS:
        if kw in name_lower:
            return 'stem'
            
    for kw in VERSION_KEYWORDS:
        if kw in name_lower:
            return 'version'
            
    # Default to version if it's longer than the main track
    return 'version'

def parse_clusters():
    clusters = []
    current_cluster = []
    
    if not os.path.exists(REPORT_PATH):
        print("Report originale non trovato!")
        return clusters
        
    with open(REPORT_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('### Gruppo'):
                if current_cluster:
                    clusters.append(current_cluster)
                    current_cluster = []
            elif line.startswith('- '):
                track_name = line[2:].strip()
                current_cluster.append(track_name)
                
    if current_cluster:
        clusters.append(current_cluster)
        
    return clusters

def main():
    clusters = parse_clusters()
    print(f"Trovati {len(clusters)} gruppi nel report.")
    
    table_rows = []
    
    for cluster in clusters:
        if not cluster: continue
        
        # Sort by length to find the "base" track (usually the shortest name)
        # However, we must strip extension for length check
        cluster_sorted = sorted(cluster, key=lambda x: len(os.path.splitext(x)[0]))
        main_track = cluster_sorted[0]
        
        versions = []
        stems = []
        
        for track in cluster_sorted[1:]:
            classification = classify_track(track, main_track)
            if classification == 'stem':
                stems.append(track)
            else:
                versions.append(track)
                
        table_rows.append({
            'main': main_track,
            'versions': versions,
            'stems': stems
        })
        
    print("Scrivendo la classificazione nel nuovo file...")
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write("# Classificazione Tracce: Main, Versioni Alternative, Stems\n\n")
        f.write("| Main Track | Alternative Versions | Stems |\n")
        f.write("|------------|----------------------|-------|\n")
        
        for row in table_rows:
            versions_str = "<br>".join(row['versions']) if row['versions'] else "-"
            stems_str = "<br>".join(row['stems']) if row['stems'] else "-"
            f.write(f"| **{row['main']}** | {versions_str} | {stems_str} |\n")
            
    print(f"Completato! File salvato in {OUTPUT_PATH}")

if __name__ == '__main__':
    main()

import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Configurazioni
SOURCE_DIR = Path("/Volumes/DADAfiles/TOMFOX/Originals")
WAV_DIR = Path("/Volumes/DADAfiles/TOMFOX/.wav")
AIFF_DIR = Path("/Volumes/DADAfiles/TOMFOX/.aiff")

# Numero di processi paralleli per velocizzare (imposta 2 o 4 a seconda del tuo Mac)
MAX_WORKERS = 4

def ensure_dirs():
    WAV_DIR.mkdir(parents=True, exist_ok=True)
    AIFF_DIR.mkdir(parents=True, exist_ok=True)

def has_ffmpeg():
    try:
        subprocess.run(["./ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def convert_audio(input_path, output_path):
    # -y sovrascrive, -loglevel error nasconde output non necessari
    cmd = ["./ffmpeg", "-y", "-i", str(input_path), "-loglevel", "error", str(output_path)]
    subprocess.run(cmd, check=True)

def process_file(file_path):
    ext = file_path.suffix.lower()
    if ext not in ['.wav', '.aif', '.aiff']:
        return None

    # Nome base senza estensione
    base_name = file_path.stem
    
    # Percorsi di destinazione
    target_wav = WAV_DIR / f"{base_name}.wav"
    target_aiff = AIFF_DIR / f"{base_name}.aiff"

    results = []

    try:
        if ext == '.wav':
            # 1. Copia l'originale in .wav (se non esiste già o se è diverso in dimensione per sicurezza, ma shutil.copy2 sovrascrive)
            if not target_wav.exists():
                shutil.copy2(file_path, target_wav)
                results.append(f"Copied {base_name}.wav")
            
            # 2. Converti in .aiff
            if not target_aiff.exists():
                convert_audio(file_path, target_aiff)
                results.append(f"Converted to {base_name}.aiff")

        elif ext in ['.aif', '.aiff']:
            # 1. Copia l'originale in .aiff
            if not target_aiff.exists():
                shutil.copy2(file_path, target_aiff)
                results.append(f"Copied {base_name}{ext}")
            
            # 2. Converti in .wav
            if not target_wav.exists():
                convert_audio(file_path, target_wav)
                results.append(f"Converted to {base_name}.wav")
        
        if not results:
            return f"Skipped {base_name} (already exists)"
        return " | ".join(results)
    
    except Exception as e:
        return f"ERROR on {base_name}: {str(e)}"

def main():
    print(f"Sorgente: {SOURCE_DIR}")
    print(f"Destinazione WAV: {WAV_DIR}")
    print(f"Destinazione AIFF: {AIFF_DIR}")
    
    if not has_ffmpeg():
        print("\n[!] ERRORE: ffmpeg non è installato o non è nel PATH.")
        print("Installa ffmpeg con: brew install ffmpeg")
        return

    ensure_dirs()

    # Raccogli tutti i file
    print("Ricerca dei file audio...")
    files_to_process = []
    for root, dirs, files in os.walk(SOURCE_DIR):
        for f in files:
            path = Path(root) / f
            if path.suffix.lower() in ['.wav', '.aif', '.aiff']:
                files_to_process.append(path)

    print(f"Trovati {len(files_to_process)} file audio. Inizio l'elaborazione...")

    # Processiamo tutti i file
    test_files = files_to_process
    
    print(f"\n--- Elaborazione Completa di {len(test_files)} file in corso... ---")

    # Elaborazione in parallelo
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        for idx, result in enumerate(executor.map(process_file, test_files)):
            print(f"[{idx+1}/{len(test_files)}] {result}")

    print("\nTest completato! Controlla le cartelle .wav e .aiff su DADAfiles.")

if __name__ == "__main__":
    main()

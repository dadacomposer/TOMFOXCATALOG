import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

type AdminTrack = any; // Will use the same from AdminTags or passed down

interface ImportTagsModalProps {
  onClose: () => void;
  onSuccess: () => void;
  existingTracks: AdminTrack[];
}

type Step = 'UPLOAD' | 'PREVIEW' | 'PROCESSING';
type ImportMode = 'REPLACE' | 'APPEND';

interface ParsedRow {
  file_name: string;
  genre?: string;
  moods?: string;
  music_for?: string;
  instruments?: string;
  functions?: string;
  movement?: string;
  character?: string;
  tempo?: string;
  arrangement?: string;
  "content id"?: string;
  pro?: string;
  [key: string]: any;
}

interface MatchedTrack {
  track: AdminTrack;
  newTags: Partial<AdminTrack>;
}

export default function ImportTagsModal({ onClose, onSuccess, existingTracks }: ImportTagsModalProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [importMode, setImportMode] = useState<ImportMode>('APPEND');
  
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [matchedTracks, setMatchedTracks] = useState<MatchedTrack[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<ParsedRow[]>([]);
  
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeString = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\.(wav|mp3|aif|aiff|m4a|flac)$/, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header, index) => {
        // We make headers unique so duplicate columns aren't overwritten
        return header.trim() + '___' + index;
      },
      complete: (results) => {
        const rows = results.data as ParsedRow[];
        
        // Validate
        // Find the exact key for file_name or track title
        let fileNameKey = Object.keys(rows[0] || {}).find(k => {
          const lower = k.toLowerCase();
          return lower.startsWith('file_name___') || lower.startsWith('track title___') || lower.startsWith('track_title___') || lower.startsWith('title___');
        });
        if (rows.length > 0 && !fileNameKey) {
          toast.error("CSV must contain a 'Track Title' or 'file_name' column");
          return;
        }

        setParsedRows(rows);
        matchTracks(rows);
        setStep('PREVIEW');
      },
      error: (error: any) => {
        console.error(error);
        toast.error("Error parsing CSV file");
      }
    });
  };

  const matchTracks = (rows: ParsedRow[]) => {
    const matched: MatchedTrack[] = [];
    const unmatched: ParsedRow[] = [];

    // Pre-compute normalized names for existing tracks for O(1) lookup
    const trackMap = new Map<string, AdminTrack>();
    existingTracks.forEach(t => {
      const norm = normalizeString(t.file_name);
      trackMap.set(norm, t);
    });

    rows.forEach(row => {
      let fileNameKey = Object.keys(row).find(k => {
        const lower = k.toLowerCase();
        return lower.startsWith('file_name___') || lower.startsWith('track title___') || lower.startsWith('track_title___') || lower.startsWith('title___');
      });
      let fileName = fileNameKey ? row[fileNameKey] : '';
      if (!fileName) return;
      const norm = normalizeString(fileName);
      const track = trackMap.get(norm);
      
      if (track) {
        matched.push({ track, newTags: row });
      } else {
        unmatched.push(row);
      }
    });

    setMatchedTracks(matched);
    setUnmatchedRows(unmatched);
  };

  const parseExistingTags = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  const splitCsvTags = (val: string | undefined): string[] => {
    if (!val) return [];
    return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  };

  const processImport = async () => {
    if (matchedTracks.length === 0) return;
    setStep('PROCESSING');
    setProgress(0);

    let completed = 0;
    
    for (const match of matchedTracks) {
      const { track, newTags } = match;
      
      const updateData: any = {};
      const tagFields = ['genre', 'moods', 'music_for', 'instruments', 'functions', 'movement', 'character', 'tempo', 'arrangement'];
      
      let tagModified = false;
      
      // Helper to extract values from multiple duplicate columns
      const extractValues = (keyBase: string) => {
        const matchingKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === keyBase.toLowerCase());
        if (matchingKeys.length === 0) return null; // column not present at all
        const values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
        return values;
      };

      tagFields.forEach(field => {
        const vals = extractValues(field);
        if (vals && vals.length > 0) {
          tagModified = true;
          const combinedCsvTags = vals.flatMap(v => splitCsvTags(v));
          if (importMode === 'REPLACE') {
            updateData[field] = JSON.stringify(combinedCsvTags);
          } else {
            const existing = parseExistingTags(track[field]);
            const combined = Array.from(new Set([...existing, ...combinedCsvTags]));
            updateData[field] = JSON.stringify(combined);
          }
        }
      });

      if (tagModified) {
        updateData.humanly_reviewed = true;
      }
      
      // Map 'content id' to frequency_audio_registered
      const contentIdKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === 'content id' || k.toLowerCase().split('___')[0] === 'freq');
      if (contentIdKeys.length > 0) {
        const val = (newTags[contentIdKeys[0]] || '').toLowerCase().trim();
        if (val === 'registered') updateData.frequency_audio_registered = true;
        else updateData.frequency_audio_registered = false;
      }
      
      // Map 'pro' to pro_registered
      const proKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === 'pro');
      if (proKeys.length > 0) {
        const val = (newTags[proKeys[0]] || '').toLowerCase().trim();
        if (val === 'registered') updateData.pro_registered = true;
        else updateData.pro_registered = false;
      }

      // New Admin Columns
      const adminMappings: Record<string, string[]> = {
        'id_number': ['id #', 'id_number'],
        'pub_admin': ['pub admin', 'pub_admin'],
        'writer': ['writer'],
        'role': ['role'],
        'pro_org': ['pro org', 'pro_org'],
        'ipi_number': ['ipi #', 'ipi_number'],
        'publisher': ['publisher/publisher 1', 'publisher', 'publisher 1'],
        'share': ['share'],
        'sub_pub': ['sub pub', 'sub_pub']
      };

      Object.entries(adminMappings).forEach(([dbField, possibleHeaders]) => {
        const matchingKeys = Object.keys(newTags).filter(k => possibleHeaders.includes(k.toLowerCase().split('___')[0]));
        if (matchingKeys.length > 0) {
          const values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
          if (values.length > 0) {
            updateData[dbField] = values.join(', ');
          } else {
            updateData[dbField] = ''; // clear if completely empty cells
          }
        }
      });
      
      if (Object.keys(updateData).length > 0) {
        await supabase.from('tracks').update(updateData).eq('id', track.id);
      }
      
      completed++;
      setProgress(Math.round((completed / matchedTracks.length) * 100));
    }

    toast.success(`Successfully updated ${matchedTracks.length} tracks`);
    onSuccess();
  };

  const downloadTemplate = () => {
    const csvContent = "Track Title,genre,moods,music_for,instruments,functions,movement,character,tempo,arrangement,content id,pro,ID #,Pub admin,writer,role,pro org,IPI #,publisher/publisher 1,share,SUB PUB\nexample_track.wav,\"Electronic, Pop\",\"Happy, Upbeat\",\"Driving, Party\",\"Synth, Drums\",\"Smooth\",\"Flowing\",\"Vocal, Instrumental\",\"High\",\"Ambient Piano\",\"Registered\",\"Needs Registration\",\"12345\",\"Admin1\",\"John Doe\",\"Composer\",\"ASCAP\",\"987654321\",\"Pub1\",\"50%\",\"SubPub1\"";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "tags_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-[24px] max-w-2xl w-full shadow-2xl animate-scale-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5 shrink-0">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest">Import Tags</h2>
            <p className="text-sm text-black/40 font-medium mt-1">Update tracks from CSV or Excel</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-black/40 hover:text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {step === 'UPLOAD' && (
            <div className="flex flex-col gap-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                  ${isDragging ? 'border-black bg-black/5' : 'border-black/10 hover:border-black/20 hover:bg-black/[0.02]'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".csv"
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-black/40" />
                </div>
                <h3 className="text-lg font-bold">Drop CSV file here</h3>
                <p className="text-sm text-black/40 mt-1">or click to browse from your computer</p>
              </div>

              <div className="bg-black/5 rounded-xl p-5">
                <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" /> Formatting Guide
                </h4>
                <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-black/60">
                <li>The file must be in <strong>.csv</strong> format.</li>
                <li>Column <strong>Track Title</strong> (or file_name) is strictly required (extensions are ignored automatically).</li>
                <li>Use comma separation for multiple tags in a column (e.g. Happy, Energetic).</li>
                <li>Supported columns: genre, moods, music_for, instruments, functions, movement, character, tempo, arrangement, content id, pro, ID #, Pub admin, writer, role, pro org, IPI #, publisher/publisher 1, share, SUB PUB.</li>
              </ul>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black bg-white border border-black/10 px-4 py-2 rounded-lg hover:bg-black/5 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
              </div>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="flex flex-col gap-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-3 text-green-600 mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">Matched Tracks</span>
                  </div>
                  <div className="text-3xl font-black text-green-700">{matchedTracks.length}</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <div className="flex items-center gap-3 text-orange-600 mb-1">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">Unmatched Rows</span>
                  </div>
                  <div className="text-3xl font-black text-orange-700">{unmatchedRows.length}</div>
                </div>
              </div>

              {unmatchedRows.length > 0 && (
                <div className="text-xs text-orange-600 bg-orange-50/50 p-3 rounded-lg">
                  <strong>Note:</strong> {unmatchedRows.length} rows in your CSV could not be matched with any tracks in the database. They will be skipped.
                </div>
              )}

              <div className="space-y-3 mt-2">
                <h4 className="font-bold uppercase tracking-widest text-xs text-black/40">Import Strategy</h4>
                
                <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${importMode === 'APPEND' ? 'border-black bg-black/[0.02]' : 'border-black/10 hover:border-black/20'}`}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    className="mt-1 w-4 h-4 text-black focus:ring-black"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                  />
                  <div>
                    <div className="font-bold">Option B: Append (Recommended)</div>
                    <div className="text-sm text-black/60">New tags will be added alongside existing tags. Duplicates will be removed automatically.</div>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${importMode === 'REPLACE' ? 'border-black bg-black/[0.02]' : 'border-black/10 hover:border-black/20'}`}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    className="mt-1 w-4 h-4 text-black focus:ring-black"
                    checked={importMode === 'REPLACE'}
                    onChange={() => setImportMode('REPLACE')}
                  />
                  <div>
                    <div className="font-bold">Option A: Replace Completely</div>
                    <div className="text-sm text-black/60">All existing tags in the affected categories will be wiped and replaced entirely by the CSV data.</div>
                  </div>
                </label>
              </div>

            </div>
          )}

          {step === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-black mb-6" />
              <h3 className="text-xl font-bold mb-2">Updating Database</h3>
              <p className="text-black/60 mb-8 text-center max-w-sm">Please keep this window open while we update the tags for your tracks.</p>
              
              <div className="w-full max-w-md bg-black/5 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-black h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-sm font-bold tracking-widest">{progress}%</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'PREVIEW' && (
          <div className="p-6 border-t border-black/5 shrink-0 flex justify-end gap-3 bg-[#fafafa] rounded-b-[24px]">
            <button 
              onClick={() => setStep('UPLOAD')}
              className="px-6 py-3 font-bold text-sm text-black/60 hover:text-black transition-colors"
            >
              Back
            </button>
            <button 
              onClick={processImport}
              disabled={matchedTracks.length === 0}
              className="px-6 py-3 font-bold text-sm bg-black text-white rounded-xl hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Import
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

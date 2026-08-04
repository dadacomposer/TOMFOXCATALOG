import re

with open('src/components/shared/TrackDetailsModal.tsx', 'r') as f:
    content = f.read()

# Add displayTrack logic
old_hooks = "const [expandedSection, setExpandedSection] = useState<{ label: string, tags: string[], rect: DOMRect } | null>(null);"
new_hooks = """const [expandedSection, setExpandedSection] = useState<{ label: string, tags: string[], rect: DOMRect } | null>(null);
  const [localTrack, setLocalTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (selectedTrackForDetails) {
      setLocalTrack(selectedTrackForDetails);
    } else {
      const t = setTimeout(() => setLocalTrack(null), 500);
      return () => clearTimeout(t);
    }
  }, [selectedTrackForDetails]);

  const displayTrack = selectedTrackForDetails || localTrack;"""

content = content.replace(old_hooks, new_hooks)

# Fix early return
content = content.replace("if (!selectedTrackForDetails) return null;", "if (!displayTrack) return null;")

# Fix animation classes
old_modal1 = """<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedTrackForDetails(null)} />
      <div className="relative w-full max-w-[90vw] md:max-w-7xl bg-[#fafafa] rounded-3xl shadow-2xl animate-slide-in-up overflow-hidden">"""

new_modal1 = """<div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ease-out ${selectedTrackForDetails ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => setSelectedTrackForDetails(null)} 
      />
      <div 
        className={`relative w-full max-w-[90vw] md:max-w-7xl bg-[#fafafa] rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-out ${selectedTrackForDetails ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
      >"""

content = content.replace(old_modal1, new_modal1)

# Now replace selectedTrackForDetails with displayTrack for all property accesses and prop passing
content = content.replace("selectedTrackForDetails.", "displayTrack.")
content = content.replace("track={selectedTrackForDetails}", "track={displayTrack}")

with open('src/components/shared/TrackDetailsModal.tsx', 'w') as f:
    f.write(content)

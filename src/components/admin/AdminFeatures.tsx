import React, { useState, useEffect } from 'react';
import { supabase, fetchPlaylists } from '../../lib/supabase';
import { Save, Settings2, Edit3, Loader2, RefreshCw, Palette } from 'lucide-react';
import { useSettings, SiteSettings, PageContent } from '../../context/SettingsContext';
import toast from 'react-hot-toast';
import CustomSelect from '../CustomSelect';
import PlaylistArtwork from '../PlaylistArtwork';


// Hardcoded character limits based on original strings to prevent layout breaks
const MAX_LENGTHS: Record<string, Record<string, number>> = {
  home: {
    hero_title: 51,
    hero_subtitle: 83,
    hero_btn_1: 6,
    hero_btn_2: 19
  },
  pricing: {
    hero_title: 79
  },
  enterprise: {
    hero_title: 10
  }
};

export default function AdminFeatures() {
  const { settings, content, refreshSettings } = useSettings();
  
  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);
  const [localContent, setLocalContent] = useState<Record<string, PageContent>>(content);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [publicPlaylists, setPublicPlaylists] = useState<any[]>([]);
  const [topPicks, setTopPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlaylists().then(data => {
      setPublicPlaylists(data || []);
      const tp: Record<string, string> = {};
      (data || []).forEach(p => {
        if (p.top_pick_position) {
          tp[`card_${p.top_pick_position}`] = p.id;
        }
      });
      setTopPicks(tp);
    });
  }, []);

  useEffect(() => {
    setLocalSettings(settings);
    setLocalContent(content);
  }, [settings, content]);

  // Toggles removed as requested

  const handleContentChange = (pageId: string, key: string, value: string) => {
    const maxLen = MAX_LENGTHS[pageId]?.[key] || 1000;
    if (value.length > maxLen) return; // Enforce strict length limit

    setLocalContent(prev => ({
      ...prev,
      [pageId]: {
        ...(prev[pageId] || {}),
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Save Settings
      const { error: settingsError } = await supabase
        .from('site_settings')
        .update(localSettings)
        .eq('id', 'default');
      
      if (settingsError) throw settingsError;

      // 2. Save Content
      const updatePromises = Object.entries(localContent).map(async ([pageId, contentObj]) => {
        const { error } = await supabase
          .from('page_content')
          .upsert({ page_id: pageId, content: contentObj }, { onConflict: 'page_id' });
        
        if (error) {
          console.error(`Error saving ${pageId}:`, error);
          throw new Error(`Failed to save ${pageId}: ${error.message}`);
        }
      });

      await Promise.all(updatePromises);
      
      // 3. Save Top Picks to Playlists
      const updateTopPicksPromises = publicPlaylists.map(async (pl) => {
        let newPosition = null;
        for (const [key, id] of Object.entries(topPicks)) {
          if (id === pl.id) {
            newPosition = parseInt(key.replace('card_', ''));
            break;
          }
        }
        
        if (pl.top_pick_position !== newPosition) {
          const { error } = await supabase
            .from('playlists')
            .update({ top_pick_position: newPosition })
            .eq('id', pl.id);
          if (error) throw new Error(`Failed to update playlist ${pl.title}: ${error.message}`);
        }
      });
      await Promise.all(updateTopPicksPromises);

      const refreshedPlaylists = await fetchPlaylists();
      setPublicPlaylists(refreshedPlaylists || []);

      await refreshSettings(); // Reload global context
      toast.success("Settings saved successfully! The public site has been updated.");

    } catch (e: any) {
      console.error(e);
      toast.error(`Error saving: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ToggleSwitch removed

  return (
    <div className="flex-1 overflow-y-auto h-full w-full -mx-8 px-8 pb-32">
      <div className="w-full max-w-5xl mx-auto space-y-12">
      
      <div className="sticky top-0 z-10 bg-[#fafafa]/80 backdrop-blur-md pt-6 md:pt-12 pb-6 border-b border-black/5 -mx-8 px-8 mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-medium uppercase tracking-tighter mb-2">Content</h2>
          <p className="text-black/50 font-sans">Control public site behavior and modify page copy instantly.</p>
        </div>
        <button 
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white font-medium uppercase tracking-widest text-xs rounded-xl hover:bg-black/80 transition-all disabled:opacity-50 shadow-sm"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Top Picks Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <Settings2 className="w-5 h-5" />
          <h3 className="text-xl font-medium uppercase tracking-tight">Top Picks For You</h3>
        </div>
        <p className="text-xs font-medium uppercase tracking-widest text-black/40">
          Assign public playlists to the 4 cards in the Browse page and select their background gradient.
        </p>
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 overflow-x-auto hide-scrollbar">
          <div className="flex gap-8 min-w-max">
            {[1, 2, 3, 4].map(num => {
              const plId = topPicks[`card_${num}`];
              const pl = publicPlaylists.find(p => p.id === plId);
              const gradient = localContent.top_picks?.[`card_${num}_gradient`] || 'bg-[#e5e5e5]';
              
              const GRADIENTS = [
                'bg-[#e5e5e5]',
                'bg-gradient-to-br from-rose-400 to-red-500',
                'bg-gradient-to-br from-fuchsia-500 to-purple-600',
                'bg-gradient-to-br from-violet-500 to-purple-500',
                'bg-gradient-to-br from-blue-500 to-cyan-500',
                'bg-gradient-to-br from-teal-400 to-emerald-500',
                'bg-gradient-to-br from-amber-400 to-orange-500',
                'bg-gradient-to-br from-gray-800 to-black',
              ];

              return (
                <div key={`card_${num}`} className="flex flex-col gap-6 w-[340px] shrink-0">
                  {/* Controls */}
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-medium uppercase tracking-widest text-black/60">
                      Card {num} Playlist
                    </label>
                    <CustomSelect
                      value={topPicks[`card_${num}`] || ''}
                      onChange={(val) => setTopPicks(prev => ({ ...prev, [`card_${num}`]: val }))}
                      searchable={true}
                      placeholder="-- No playlist --"
                      options={[
                        { value: '', label: '-- No playlist --' },
                        ...publicPlaylists.map(p => ({
                          value: p.id,
                          label: `${p.title} ${p.is_featured ? '(Featured)' : ''}`
                        }))
                      ]}
                    />
                    <label className="text-xs font-medium uppercase tracking-widest text-black/60 mt-1">
                      Gradient Color
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {GRADIENTS.map(g => (
                        <button
                          key={g}
                          onClick={() => {
                            setLocalContent(prev => ({
                              ...prev,
                              top_picks: {
                                ...(prev.top_picks || {}),
                                [`card_${num}_gradient`]: g
                              }
                            }));
                          }}
                          className={`w-6 h-6 rounded-full border border-black/10 shadow-sm ${g} ${gradient === g ? 'ring-2 ring-black ring-offset-2 scale-110' : 'hover:scale-110 transition-transform'}`}
                          title={g}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Preview Card */}
                  <div className={`flex flex-col p-4 rounded-[32px] ${gradient} w-full transition-all duration-300 border border-black/5`}>
                    <div className="relative w-full aspect-[1.15] mb-6">
                      {pl ? (
                        <>
                          <PlaylistArtwork playlist={pl} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md z-0" />
                          <PlaylistArtwork playlist={pl} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md z-10" />
                          <PlaylistArtwork playlist={pl} className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl z-20" />
                        </>
                      ) : (
                        <div className="w-full h-full border-2 border-dashed border-black/10 rounded-[28px] flex flex-col items-center justify-center text-center p-4">
                          <span className="text-xs font-bold uppercase tracking-widest text-black/30">No Playlist</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col px-2 pb-2">
                      <span className={`font-medium text-[18px] ${gradient === 'bg-[#e5e5e5]' ? 'text-black' : 'text-white'} line-clamp-1`}>
                        {pl ? pl.title : 'Select a playlist'}
                      </span>
                      <span className={`font-sans text-[13px] ${gradient === 'bg-[#e5e5e5]' ? 'text-black/50' : 'text-white/70'} mt-0.5`}>
                        {pl ? `${pl.track_count} tracks` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Artwork Frames Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <Palette className="w-5 h-5" />
          <h3 className="text-xl font-medium uppercase tracking-tight">Artwork Frames</h3>
        </div>
        <p className="text-xs font-medium uppercase tracking-widest text-black/40">
          Enable or disable the custom CSS frames around public playlist artworks.
        </p>
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 flex flex-col md:flex-row gap-6">
           <div className="flex-1 space-y-4">
             <div>
               <h4 className="font-bold uppercase tracking-tighter">Public Playlist Frames</h4>
               <p className="text-sm font-sans text-black/50 mb-4">When disabled, only the raw uploaded image will be shown.</p>
               
               <button 
                 onClick={() => setLocalSettings(prev => ({ ...prev, public_artwork_frames_enabled: !prev.public_artwork_frames_enabled }))}
                 className={`preview-toggle w-12 h-6 rounded-full transition-colors relative ${localSettings.public_artwork_frames_enabled ? 'bg-black' : 'bg-black/20'}`}
               >
                 <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-all ${localSettings.public_artwork_frames_enabled ? 'left-[calc(100%-1.25rem)]' : 'left-1'}`} />
               </button>
             </div>
           </div>

           {/* Live Preview block */}
           <div className="w-full md:w-64 shrink-0 border border-black/10 bg-[#fafafa] rounded-xl p-4 flex flex-col items-center justify-center">
             <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-4">Live Preview</span>
             <div className="w-32 aspect-square relative group">
               {localSettings.public_artwork_frames_enabled ? (
                 <>
                   <PlaylistArtwork playlist={publicPlaylists[0] || {}} forcePreviewFrames={true} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md z-0" />
                   <PlaylistArtwork playlist={publicPlaylists[0] || {}} forcePreviewFrames={true} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md z-10" />
                   <PlaylistArtwork playlist={publicPlaylists[0] || {}} forcePreviewFrames={true} className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl z-20" />
                 </>
               ) : (
                 <PlaylistArtwork playlist={publicPlaylists[0] || {}} forcePreviewFrames={false} className="absolute top-0 left-0 w-full h-full shadow-md z-20 rounded-[12px]" />
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Content Editor Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <Edit3 className="w-5 h-5" />
          <h3 className="text-xl font-medium uppercase tracking-tight">Content Editor</h3>
        </div>
        <p className="text-xs font-medium uppercase tracking-widest text-black/40">
          Strict character limits are enforced to prevent layout breaks on the public site.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {Object.entries(localContent).filter(([pageId]) => pageId !== 'top_picks').map(([pageId, fields]) => (
            <div key={pageId} className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden transition-all">
              <button 
                onClick={() => setExpandedPage(expandedPage === pageId ? null : pageId)}
                className="w-full px-6 py-5 flex items-center justify-between bg-black/5 hover:bg-black/10 transition-colors"
              >
                <span className="font-medium uppercase tracking-widest text-sm">{pageId} Page</span>
                <span className="text-xs font-medium text-black/40">{expandedPage === pageId ? 'Close' : 'Edit'}</span>
              </button>
              
              {expandedPage === pageId && (
                <div className="p-6 grid grid-cols-1 gap-6">
                  {Object.entries(fields)
                    .filter(([fieldKey]) => !fieldKey.includes('btn') && !fieldKey.includes('top_picks_card_'))
                    .map(([fieldKey, fieldValue]) => {
                    const maxLen = MAX_LENGTHS[pageId]?.[fieldKey] || 1000;
                    const isLongText = fieldKey.includes('subtitle') || fieldKey.includes('desc');
                    
                    return (
                      <div key={fieldKey} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium uppercase tracking-widest text-black/60">
                            {fieldKey.replace(/_/g, ' ')}
                          </label>
                          <span className={`text-[10px] font-medium font-mono ${fieldValue.length >= maxLen ? 'text-red-500' : 'text-black/30'}`}>
                            {fieldValue.length} / {maxLen}
                          </span>
                        </div>
                        {isLongText ? (
                          <textarea 
                            value={fieldValue}
                            onChange={(e) => handleContentChange(pageId, fieldKey, e.target.value)}
                            maxLength={maxLen}
                            rows={3}
                            className="w-full bg-[#fafafa] border border-black/10 rounded-xl px-4 py-3 font-sans text-sm focus:bg-white focus:border-black/30 outline-none transition-all resize-none"
                          />
                        ) : (
                          <input 
                            type="text"
                            value={fieldValue}
                            onChange={(e) => handleContentChange(pageId, fieldKey, e.target.value)}
                            maxLength={maxLen}
                            className="w-full bg-[#fafafa] border border-black/10 rounded-xl px-4 py-3 font-sans text-sm focus:bg-white focus:border-black/30 outline-none transition-all"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      </div>
    </div>
  );
}

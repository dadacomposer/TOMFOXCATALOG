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
      
      <div className="sticky top-0 z-10 bg-[#fafafa] pt-6 md:pt-12 pb-6 border-b border-black/5 -mx-8 px-8 mb-8 flex items-center justify-between">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-black/40">
            Assign public playlists to the 10 cards in the Browse page and select their background gradient.
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">SVG Animation</span>
            <button 
              onClick={() => setLocalSettings(prev => ({ ...prev, top_picks_animation_enabled: !prev.top_picks_animation_enabled }))}
              className={`preview-toggle w-9 h-5 rounded-full p-[2px] transition-colors relative flex items-center shadow-inner ${localSettings.top_picks_animation_enabled !== false ? 'bg-[#111111]' : 'bg-[#e0e0e0]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${localSettings.top_picks_animation_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6">
          <div className="flex overflow-x-auto hide-scrollbar gap-6 w-full pb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
              const plId = topPicks[`card_${num}`];
              const pl = publicPlaylists.find(p => p.id === plId);
              
              const cardStyles = [
                { baseColor: 'bg-gradient-to-br from-[#1E293B] to-[#0F172A]', bgIdle: 'bg-[#38BDF8]/20', bgHover: 'bg-[#38BDF8]/40' },
                { baseColor: 'bg-gradient-to-br from-[#3F3F46] to-[#18181B]', bgIdle: 'bg-[#A78BFA]/20', bgHover: 'bg-[#A78BFA]/40' },
                { baseColor: 'bg-gradient-to-br from-[#1E1B4B] to-[#09090B]', bgIdle: 'bg-[#F472B6]/20', bgHover: 'bg-[#F472B6]/40' },
                { baseColor: 'bg-gradient-to-br from-[#0F172A] to-[#020617]', bgIdle: 'bg-[#34D399]/20', bgHover: 'bg-[#34D399]/40' },
                { baseColor: 'bg-gradient-to-br from-[#451A03] to-[#1C0901]', bgIdle: 'bg-[#FBBF24]/20', bgHover: 'bg-[#FBBF24]/40' },
                { baseColor: 'bg-gradient-to-br from-[#064E3B] to-[#022C22]', bgIdle: 'bg-[#6EE7B7]/20', bgHover: 'bg-[#6EE7B7]/40' },
                { baseColor: 'bg-gradient-to-br from-[#4C1D95] to-[#2E1065]', bgIdle: 'bg-[#C084FC]/20', bgHover: 'bg-[#C084FC]/40' },
                { baseColor: 'bg-gradient-to-br from-[#701A75] to-[#4A044E]', bgIdle: 'bg-[#E879F9]/20', bgHover: 'bg-[#E879F9]/40' },
                { baseColor: 'bg-gradient-to-br from-[#1E3A8A] to-[#172554]', bgIdle: 'bg-[#60A5FA]/20', bgHover: 'bg-[#60A5FA]/40' },
                { baseColor: 'bg-gradient-to-br from-[#7F1D1D] to-[#450A0A]', bgIdle: 'bg-[#F87171]/20', bgHover: 'bg-[#F87171]/40' }
              ];
              const style = cardStyles[num - 1];

              return (
                <div key={`card_${num}`} className="flex flex-col gap-6 w-[280px] shrink-0">
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
                          label: p.title
                        }))
                      ]}
                    />
                  </div>
                  
                  {/* Preview Card */}
                  <div className={`relative w-full aspect-[3/4] rounded-[32px] overflow-hidden group shadow-sm transition-all duration-500 border border-transparent ${style.baseColor}`}>
                    {/* Animated Mesh Background (Idle State) */}
                    <div className="absolute inset-[-100%] animate-[spin_16s_linear_infinite] origin-[45%_55%] pointer-events-none">
                      <div className={`absolute inset-0 ${style.bgIdle} blur-[100px] scale-150`} />
                    </div>
                    
                    {/* Animated Mesh Background (Active State) */}
                    <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] origin-[45%_55%] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                      <div className={`absolute inset-0 ${style.bgHover} blur-[100px] scale-150`} />
                    </div>

                    {/* Logo */}
                    <img 
                      src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
                      alt="Tom Fox" 
                      className="absolute top-6 right-6 h-[18px] object-contain invert opacity-90 mix-blend-plus-lighter z-20"
                    />

                    {/* Bottom Content */}
                    <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end h-[60%] bg-gradient-to-t from-black/80 via-black/30 to-transparent z-20">
                      <div className="flex items-end justify-between w-full mt-auto">
                        <span className="text-white font-medium tracking-tight text-lg drop-shadow-md leading-[1.1] max-w-[80%]">
                          {pl ? pl.title : 'No Playlist'}
                        </span>
                      </div>
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
                 className={`preview-toggle w-9 h-5 rounded-full p-[2px] transition-colors relative flex items-center shadow-inner ${localSettings.public_artwork_frames_enabled ? 'bg-[#111111]' : 'bg-[#e0e0e0]'}`}
               >
                 <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${localSettings.public_artwork_frames_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
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

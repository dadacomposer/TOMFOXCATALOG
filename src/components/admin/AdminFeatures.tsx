import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Settings2, Edit3, Loader2, RefreshCw } from 'lucide-react';
import { useSettings, SiteSettings, PageContent } from '../../context/SettingsContext';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    setLocalSettings(settings);
    setLocalContent(content);
  }, [settings, content]);

  const handleToggle = (key: keyof SiteSettings) => {
    if (key === 'free_hd_enabled' && localSettings.free_watermarks_enabled) {
      return;
    }

    setLocalSettings(prev => {
      const nextValue = !prev[key];
      const updates = { ...prev, [key]: nextValue };
      
      if (key === 'free_watermarks_enabled' && nextValue === true) {
        updates.free_hd_enabled = false;
      }
      
      return updates;
    });
  };

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
      const updatePromises = Object.entries(localContent).map(([pageId, contentObj]) => {
        return supabase
          .from('page_content')
          .update({ content: contentObj })
          .eq('page_id', pageId);
      });

      await Promise.all(updatePromises);
      await refreshSettings(); // Reload global context
      toast.success("Settings saved successfully! The public site has been updated.");

    } catch (e: any) {
      console.error(e);
      toast.error(`Error saving: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ label, desc, active, disabled = false, onClick }: { label: string, desc: string, active: boolean, disabled?: boolean, onClick: () => void }) => (
    <div className={`flex items-center justify-between p-6 bg-white rounded-2xl border ${disabled ? 'border-black/5 opacity-50' : 'border-black/10'} shadow-sm transition-all`}>
      <div className="pr-8">
        <h3 className="font-medium text-lg mb-1">{label}</h3>
        <p className="text-sm text-black/50 leading-relaxed">{desc}</p>
      </div>
      <button 
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${active ? 'bg-green-500' : 'bg-black/10'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto h-full w-full -mx-8 px-8 pb-32">
      <div className="py-6 md:py-12 w-full max-w-5xl mx-auto space-y-12 animate-fade-in-up">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-medium uppercase tracking-tighter mb-2">Public Content</h2>
          <p className="text-black/50 font-sans">Control public site behavior and modify page copy instantly.</p>
        </div>
        <button 
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white font-medium uppercase tracking-widest text-xs rounded-xl hover:bg-black/80 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Feature Flags Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <Settings2 className="w-5 h-5" />
          <h3 className="text-xl font-medium uppercase tracking-tight">Global Toggles</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <ToggleSwitch 
            label="Enable Public Subscriptions (SaaS Mode)"
            desc="If OFF, the public Pricing page turns into a lead generation funnel, and the Billing/Licenses tabs disappear from user profiles."
            active={localSettings.subscriptions_enabled}
            onClick={() => handleToggle('subscriptions_enabled')}
          />
          <ToggleSwitch 
            label="Watermarks for Free Users"
            desc="If OFF, non-logged and free users will download standard MP3 files instead of watermarked audio when they click 'Try It'."
            active={localSettings.free_watermarks_enabled}
            onClick={() => handleToggle('free_watermarks_enabled')}
          />
          <ToggleSwitch 
            label="Enable HD Audio (WAV/AIF) for Free Users"
            desc="If ON, non-logged and free users can download uncompressed WAV and AIFF files without a subscription."
            active={localSettings.free_hd_enabled}
            disabled={localSettings.free_watermarks_enabled}
            onClick={() => handleToggle('free_hd_enabled')}
          />
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
          {Object.entries(localContent).map(([pageId, fields]) => (
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
                    .filter(([fieldKey]) => !fieldKey.includes('btn'))
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SiteSettings = {
  subscriptions_enabled: boolean;
  free_watermarks_enabled: boolean;
  free_hd_enabled: boolean;
  public_artwork_frames_enabled: boolean;
  top_picks_animation_enabled: boolean;
};

type SettingsContextType = {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
};

const defaultSettings: SiteSettings = {
  subscriptions_enabled: false,
  free_watermarks_enabled: false,
  free_hd_enabled: true,
  public_artwork_frames_enabled: true,
  top_picks_animation_enabled: true,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'default').single();

      if (data) {
        console.log("Settings fetched from DB:", data);
        setSettings({ ...defaultSettings, ...data });
      } else if (error) {
        console.error("Error fetching settings from DB:", error);
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchAll }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

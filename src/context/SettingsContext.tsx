import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SiteSettings = {
  subscriptions_enabled: boolean;
  free_watermarks_enabled: boolean;
  free_hd_enabled: boolean;
  public_artwork_frames_enabled: boolean;
  top_picks_animation_enabled: boolean;
};

export type PageContent = Record<string, string>;

type SettingsContextType = {
  settings: SiteSettings;
  content: Record<string, PageContent>;
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

export const DEFAULT_CONTENT: Record<string, PageContent> = {
  home: {
    hero_title: 'The Soundtrack <br />For Modern <br />Storytelling.',
    hero_subtitle: 'A meticulously curated library of 2,500+ premium tracks for media, ads, and film.',
    hero_btn_1: 'Browse',
    hero_btn_2: 'Create Free Account',
    built_for_title: 'Built for creators, directors, and brands who refuse to compromise on sound.',
    curated_title: 'Curated for<br/>your story.',
    curated_desc: 'Forget generic stock tracks. Dive into hand-picked playlists designed to give your project the exact sound it needs.',
    search_title: 'Search less, create more.',
    search_ai_label: 'Try our AI driven search',
    search_find_title: 'Find the exact vibe.',
    search_find_desc: 'Describe what you need in plain English. Our search engine understands mood, instrumentation, and genre, delivering pinpoint accuracy in seconds.',
    search_preview_label: 'Instant Toggle Preview',
    search_preview_title: 'Preview instantly.',
    search_preview_desc: "Don't waste time clicking into every track. Flip the preview toggle to instantly scrub through the best parts of any song directly from the search results.",
    beyond_title: 'Beyond the Library',
    beyond_subtitle: 'Custom Music and Sound',
    beyond_desc: 'Some projects demand a completely original sound. We craft bespoke scores and custom sound design for high-stakes campaigns.'
  },
  pricing: {
    hero_title: 'Pick your plan,',
    hero_subtitle: 'Get unlimited access.',
    hero_custom_title: 'Custom Music & Licensing',
    hero_custom_subtitle: 'Built for your project.',
    hero_custom_desc: 'We craft bespoke scores, custom sound design, and provide tailored clearance for high-stakes campaigns.',
    ind_perks_title: 'Perfect for freelance filmmakers, wedding videographers, creators, and podcasters. All individual subscriptions include:',
    ind_other: "Don't fit into these categories? Contact Sales for Other Use Cases.",
    biz_perks_title: 'Perfect for production companies, agencies, brands, and non-profits. All business subscriptions include:',
    biz_other: 'Need Extended Options? (TV, Cinema, Radio)',
    included_title: "What's included",
    inc_1_title: 'Unlimited Access',
    inc_1_desc: 'Full access to our entire premium catalog of world-class, curated music.',
    inc_2_title: 'Monetization Ready',
    inc_2_desc: 'Keep what you earn. Full monetization rights across YouTube, social, and web.',
    inc_3_title: 'Frictionless Clearance',
    inc_3_desc: 'Simple, whitelist-driven copyright clearance. No strikes, no stress.',
    inc_4_title: 'Direct Licensing',
    inc_4_desc: "You're licensing directly from the source. Zero hidden fees or third-party headaches.",
    curated_title: 'Curated for<br/>your story.',
    curated_desc: "Don't settle for boring stock music. Find the exact vibe you need from our hand-picked collections.",
    beyond_title: 'Beyond the Library',
    beyond_subtitle: 'Custom Music and Sound',
    beyond_desc: 'Some projects demand a completely original sound. We craft bespoke scores and custom sound design for high-stakes campaigns.'
  },
  enterprise: {
    hero_title: 'Scale your<br />sound.',
    hero_desc: 'Uncapped access for teams that build at scale. No limits, no legal headaches.',
    clients_title: 'Among our<br/>clients.',
    perk_1_title: 'Zero Clearance Drama.',
    perk_1_desc: 'We play nice with procurement. Standardized MSAs ready to sign, indemnification included, and global all-media rights cleared upfront.',
    perk_2_title: 'Your Personal<br />Supervisor',
    perk_2_desc: 'Need the perfect track fast? Talk directly to humans who know the catalog inside out.',
    perk_3_title: 'The Secret<br />Vault',
    perk_3_desc: 'Get exclusive early access to unreleased tracks, custom scores, and stems for your sound design.',
    contact_title: "Let's<br />Talk<br />Scale.",
    contact_desc: 'Our enterprise team will reach out within 24 hours.'
  },
  top_picks: {
    card_1: '',
    card_2: '',
    card_3: '',
    card_4: ''
  }
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  content: {},
  loading: true,
  refreshSettings: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [content, setContent] = useState<Record<string, PageContent>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [settingsRes, contentRes] = await Promise.all([
        supabase.from('site_settings').select('*').eq('id', 'default').single(),
        supabase.from('page_content').select('*')
      ]);

      if (settingsRes.data) {
        console.log("Settings fetched from DB:", settingsRes.data);
        setSettings({ ...defaultSettings, ...settingsRes.data });
      } else if (settingsRes.error) {
        console.error("Error fetching settings from DB:", settingsRes.error);
      }

      if (contentRes.data) {
        const contentMap: Record<string, PageContent> = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
        contentRes.data.forEach((row: any) => {
          if (contentMap[row.page_id]) {
            contentMap[row.page_id] = { ...contentMap[row.page_id], ...row.content };
          } else {
            contentMap[row.page_id] = row.content;
          }
        });
        setContent(contentMap);
      } else {
        setContent(DEFAULT_CONTENT);
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
    <SettingsContext.Provider value={{ settings, content, loading, refreshSettings: fetchAll }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

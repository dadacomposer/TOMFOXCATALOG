import { supabase } from './supabase';

// Get or create a session ID for the current browser session
let sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('tf_session_id') : null;
if (!sessionId && typeof window !== 'undefined') {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem('tf_session_id', sessionId);
}

export const analytics = {
  /**
   * Track when a track playback starts
   */
  trackPlayStart: async (trackId: string, userId?: string) => {
    try {
      await supabase.from('play_events').insert({
        track_id: trackId,
        user_id: userId || null,
        session_id: sessionId || 'unknown',
        event_type: 'start',
        duration: 0
      });
    } catch (err) {
      console.error('Analytics error:', err);
    }
  },

  /**
   * Track periodic playback progress
   */
  trackPlayPing: async (trackId: string, durationSeconds: number, userId?: string) => {
    try {
      await supabase.from('play_events').insert({
        track_id: trackId,
        user_id: userId || null,
        session_id: sessionId || 'unknown',
        event_type: 'ping',
        duration: durationSeconds
      });
    } catch (err) {
      console.error('Analytics error:', err);
    }
  },

  /**
   * Track when a user searches for something
   */
  trackSearch: async (query: string, userId?: string) => {
    if (!query || query.trim() === '') return;
    try {
      await supabase.from('search_events').insert({
        query: query.trim(),
        user_id: userId || null,
        session_id: sessionId || 'unknown'
      });
    } catch (err) {
      console.error('Analytics error:', err);
    }
  },

  /**
   * Track when a user applies a filter
   */
  trackFilter: async (category: string, value: string, userId?: string) => {
    try {
      await supabase.from('filter_events').insert({
        category,
        value,
        user_id: userId || null,
        session_id: sessionId || 'unknown'
      });
    } catch (err) {
      console.error('Analytics error:', err);
    }
  }
};

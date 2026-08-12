import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Search, Play, Filter, TrendingUp, Clock } from 'lucide-react';

type StatsData = {
  top_tracks: { file_name: string; play_count: number }[] | null;
  top_searches: { query: string; search_count: number }[] | null;
  top_filters: { category: string; value: string; usage_count: number }[] | null;
  plays_today: number;
  searches_today: number;
};

export default function AdminStatistics() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats(true);

    const channel = supabase.channel('statistics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'play_events' }, () => {
        fetchStats(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'search_events' }, () => {
        fetchStats(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'filter_events' }, () => {
        fetchStats(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_statistics');
      if (error) throw error;
      setStats(data as StatsData);
    } catch (err: any) {
      console.error('Failed to fetch stats', err);
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow p-8 flex items-center justify-center min-h-0 bg-[#fafafa]">
        <div className="text-black/40 text-xs font-medium uppercase tracking-widest">Loading statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-grow p-8 flex items-center justify-center min-h-0 bg-[#fafafa]">
        <div className="text-red-500 font-medium">Error loading: {error}</div>
      </div>
    );
  }

  // Calculate max values for bar charts
  const maxPlays = stats.top_tracks?.length ? Math.max(...stats.top_tracks.map(t => t.play_count)) : 0;
  const maxSearches = stats.top_searches?.length ? Math.max(...stats.top_searches.map(s => s.search_count)) : 0;
  const maxFilters = stats.top_filters?.length ? Math.max(...stats.top_filters.map(f => f.usage_count)) : 0;

  return (
    <div className="flex-grow p-4 md:p-8 min-h-0 bg-[#fafafa] overflow-y-auto">
      <div className="w-full max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-medium tracking-tight mb-2 flex items-center gap-3">
            <BarChart className="w-8 h-8 text-black/80" />
            Statistics & Analytics
          </h1>
          <p className="text-black/50">Overview of user interactions with the catalog.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-widest text-black/40 mb-1">Plays Today (24h)</div>
              <div className="text-4xl font-semibold tracking-tighter">{stats.plays_today || 0}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-500 ml-1" />
            </div>
          </div>
          <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-widest text-black/40 mb-1">Searches Today (24h)</div>
              <div className="text-4xl font-semibold tracking-tighter">{stats.searches_today || 0}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
              <Search className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Tracks */}
          <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-black/50" />
              <h2 className="text-lg font-medium">Top Played Tracks</h2>
            </div>
            {stats.top_tracks && stats.top_tracks.length > 0 ? (
              <div className="space-y-4">
                {stats.top_tracks.map((track, i) => (
                  <div key={i} className="relative">
                    <div className="flex justify-between items-center mb-1 relative z-10">
                      <div className="font-normal truncate pr-4 text-sm">{track.file_name}</div>
                      <div className="text-xs font-medium text-black/50 tabular-nums">{track.play_count}</div>
                    </div>
                    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${maxPlays > 0 ? (track.play_count / maxPlays) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-black/40 py-8 text-sm">No data available</div>
            )}
          </div>

          <div className="space-y-8">
            {/* Top Searches */}
            <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Search className="w-5 h-5 text-black/50" />
                <h2 className="text-lg font-medium">Top Searches</h2>
              </div>
              {stats.top_searches && stats.top_searches.length > 0 ? (
                <div className="space-y-4">
                  {stats.top_searches.map((search, i) => (
                    <div key={i} className="relative">
                      <div className="flex justify-between items-center mb-1 relative z-10">
                        <div className="font-normal text-sm truncate pr-4">"{search.query}"</div>
                        <div className="text-xs font-medium text-black/50 tabular-nums">{search.search_count}</div>
                      </div>
                      <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${maxSearches > 0 ? (search.search_count / maxSearches) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-black/40 py-8 text-sm">No data available</div>
              )}
            </div>

            {/* Top Filters */}
            <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-black/50" />
                <h2 className="text-lg font-medium">Top Filters Used</h2>
              </div>
              {stats.top_filters && stats.top_filters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.top_filters.map((filter, i) => (
                    <div key={i} className="flex items-center gap-2 bg-black/5 rounded-full pl-3 pr-2 py-1.5 border border-black/10">
                      <div className="text-[10px] font-medium uppercase tracking-widest text-black/40">{filter.category}</div>
                      <div className="text-sm font-normal">{filter.value}</div>
                      <div className="text-[10px] font-medium bg-white text-black px-1.5 py-0.5 rounded-full border border-black/10 tabular-nums">
                        {filter.usage_count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-black/40 py-8 text-sm">No data available</div>
              )}
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}

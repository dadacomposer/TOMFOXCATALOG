import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Loader2, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PlaylistArtwork from '../PlaylistArtwork';

type Playlist = {
  id: string;
  title: string;
  description: string;
  track_count?: number;
  sort_order: number;
  cover_url?: string;
};

export default function AdminPlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('id, title, description, track_count, sort_order, cover_url')
        .is('user_id', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (err: any) {
      console.error('Error fetching playlists:', err);
      toast.error('Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    const newPlaylists = Array.from(playlists);
    const [reorderedItem] = newPlaylists.splice(sourceIndex, 1);
    newPlaylists.splice(destinationIndex, 0, reorderedItem);
    
    // Update local state immediately for snappy UI
    setPlaylists(newPlaylists);
  };

  const saveOrder = async () => {
    setIsSaving(true);
    try {
      // Create bulk update payload
      const updates = playlists.map((pl, index) => {
        return supabase
          .from('playlists')
          .update({ sort_order: index })
          .eq('id', pl.id);
      });

      await Promise.all(updates);
      toast.success('Playlist order saved successfully!');
      
      // Update local state to reflect new sort_order
      setPlaylists(prev => prev.map((p, i) => ({ ...p, sort_order: i })));
    } catch (err: any) {
      console.error('Error saving playlist order:', err);
      toast.error('Failed to save order');
      fetchPlaylists(); // Revert to DB state on error
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-black/40" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 p-6 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter mb-1">Playlist Manager</h1>
          <p className="text-black/50 text-sm font-sans">
            Drag and drop public playlists to change their display order on the Playlists page.
          </p>
        </div>
        <button
          onClick={saveOrder}
          disabled={isSaving}
          className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-black/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Display Order
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="flex items-center px-6 py-4 bg-[#f8f8f8] border-b border-black/10 font-bold uppercase tracking-widest text-[10px] text-black/50">
          <div className="w-12 shrink-0">Order</div>
          <div className="w-20 shrink-0">Cover</div>
          <div className="flex-grow">Playlist Title</div>
          <div className="w-24 shrink-0 text-center">Tracks</div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="playlists-list">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="flex flex-col"
              >
                {playlists.map((pl, index) => (
                  <Draggable key={pl.id} draggableId={pl.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center px-6 py-4 border-b border-black/5 bg-white transition-colors group ${
                          snapshot.isDragging ? 'shadow-xl scale-[1.01] z-50 rounded-lg border-transparent' : 'hover:bg-[#fafafa]'
                        }`}
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className="w-12 shrink-0 cursor-grab active:cursor-grabbing text-black/20 hover:text-black transition-colors"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>
                        
                        <div className="w-20 shrink-0">
                          <div className="w-12 h-12 bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
                            {pl.cover_url ? (
                               <img src={pl.cover_url} className="w-full h-full object-cover" />
                             ) : (
                               <PlaylistArtwork playlist={pl as any} className="w-full h-full object-cover" />
                             )}
                          </div>
                        </div>

                        <div className="flex-grow pr-4">
                          <h3 className="font-bold text-sm uppercase tracking-tighter text-black truncate">
                            {pl.title}
                          </h3>
                          {pl.description && (
                            <p className="font-sans text-xs text-black/50 truncate max-w-md mt-0.5">
                              {pl.description}
                            </p>
                          )}
                        </div>

                        <div className="w-24 shrink-0 text-center font-sans text-xs text-black/60">
                          {pl.track_count || 0}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {playlists.length === 0 && (
                  <div className="px-6 py-12 text-center font-sans text-sm text-black/40">
                    No public playlists found. Create one in the Playlists page and make it public.
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}

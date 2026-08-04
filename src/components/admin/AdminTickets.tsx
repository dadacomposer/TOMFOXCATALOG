import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Ticket, Plus, Clock, CheckCircle, Trash2, X, AlertCircle, ChevronDown, Check, MessageSquare } from 'lucide-react';

type DeveloperTicket = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  created_at: string;
};



export default function AdminTickets() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  const [tickets, setTickets] = useState<DeveloperTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTicket, setActiveTicket] = useState<DeveloperTicket | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  
  const priorityLabels = {
    low: 'Low (Whenever possible)',
    normal: 'Normal',
    high: 'High (Important)',
    urgent: 'Urgent (Platform is broken)'
  };
  


  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      if (user.email === 'admin@tomfox.com') {
        setIsClient(true);
      } else {
        setIsClient(false);
      }
      fetchTickets();
    }
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('developer_tickets')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) {
      setTickets(data as DeveloperTicket[]);
    }
    setIsLoading(false);
  };

  const openTicket = (t: DeveloperTicket) => {
    setActiveTicket(t);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    
    const { data, error } = await supabase
      .from('developer_tickets')
      .insert({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        created_by: currentUser.id
      })
      .select()
      .single();
      
    if (error) {
      toast.error(error.message || 'Failed to create ticket');
      console.error(error);
      return;
    }

    if (data) {
      setTickets([data as DeveloperTicket, ...tickets]);
      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('normal');
    }
  };



  const handleResolve = async (ticketId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
    const { error } = await supabase
      .from('developer_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);
      
    if (!error) {
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
      if (activeTicket?.id === ticketId) {
        setActiveTicket({ ...activeTicket, status: newStatus as any });
      }
    }
  };

  const handleDelete = async (ticketId: string) => {
    setDeleteTicketId(ticketId);
  };

  const confirmDelete = async () => {
    if (!deleteTicketId) return;
    
    const { error } = await supabase
      .from('developer_tickets')
      .delete()
      .eq('id', deleteTicketId);
      
    if (!error) {
      setTickets(tickets.filter(t => t.id !== deleteTicketId));
      if (activeTicket?.id === deleteTicketId) {
        setActiveTicket(null);
      }
    }
    setDeleteTicketId(null);
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600'
  };

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar: Ticket List */}
      <div className="w-1/3 flex flex-col min-h-0 bg-white border border-black/10 rounded-2xl shadow-sm overflow-hidden shrink-0">
        <div className="p-6 border-b border-black/10 bg-[#fafafa]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Ticket className="w-5 h-5" /> 
              {isClient ? 'My Requests' : 'Incoming Tickets'}
            </h2>
          </div>
          <p className="text-sm text-black/50 mb-4">
            {isClient ? 'Report bugs or request new features directly to Daniel.' : 'Manage client requests.'}
          </p>
          
          {isClient && (
            <button 
              onClick={() => setShowNewModal(true)}
              className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Request
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <p className="text-center text-black/40 text-sm mt-4">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-center text-black/40 text-sm mt-4">No tickets found.</p>
          ) : (
            tickets.map(t => (
              <div 
                key={t.id} 
                onClick={() => openTicket(t)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTicket?.id === t.id ? 'border-black bg-black/5 shadow-inner' : 'border-black/10 hover:border-black/30 hover:shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm truncate pr-2">{t.title}</h3>
                  {t.status === 'resolved' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-black/50 line-clamp-2 mb-3">{t.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${priorityColors[t.priority]}`}>
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-black/40">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Chat View */}
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-black/10 rounded-2xl shadow-sm overflow-hidden relative">
        {!activeTicket ? (
          <div className="h-full flex flex-col items-center justify-center text-black/30">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold">Select a ticket to view details</p>
          </div>
        ) : (
          <>
            <div className="p-8 h-full flex flex-col bg-[#fafafa]">
              <div className="flex justify-between items-start mb-6 gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-3xl font-bold leading-tight">{activeTicket.title}</h2>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${activeTicket.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {activeTicket.status}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${priorityColors[activeTicket.priority]}`}>
                      {activeTicket.priority}
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-black/40">Submitted on {new Date(activeTicket.created_at).toLocaleDateString()} at {new Date(activeTicket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => handleResolve(activeTicket.id, activeTicket.status)}
                    className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${activeTicket.status === 'resolved' ? 'bg-black/10 text-black hover:bg-black/20' : 'bg-green-500 text-white hover:bg-green-600'}`}
                  >
                    {activeTicket.status === 'resolved' ? 'Reopen' : 'Flag as resolved'}
                    {activeTicket.status !== 'resolved' && <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(activeTicket.id)}
                    className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    title="Delete Ticket"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-white border border-black/10 rounded-3xl p-8 overflow-y-auto shadow-sm">
                <p className="text-black/80 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {activeTicket.description}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-black/10 flex justify-between items-center bg-[#fafafa] rounded-t-3xl">
              <h2 className="text-xl font-bold">New Request</h2>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Title</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="E.g., Bug with download button"
                  className="w-full border border-black/20 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Description</label>
                <textarea 
                  required
                  rows={4}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Please describe the issue or feature request in detail..."
                  className="w-full border border-black/20 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors resize-none"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Priority</label>
                <div 
                  onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                  className={`w-full border ${isPriorityOpen ? 'border-black' : 'border-black/20'} rounded-xl px-4 py-3 transition-colors bg-white cursor-pointer flex justify-between items-center`}
                >
                  <span className={newPriority !== 'normal' ? 'font-bold' : ''}>{priorityLabels[newPriority]}</span>
                  <ChevronDown className={`w-4 h-4 text-black/50 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {isPriorityOpen && (
                  <div className="absolute top-full mt-2 left-0 w-full bg-white border border-black/10 shadow-xl rounded-xl z-[110] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <div 
                        key={key}
                        onClick={() => {
                          setNewPriority(key as any);
                          setIsPriorityOpen(false);
                        }}
                        className={`px-4 py-3 cursor-pointer hover:bg-black/5 flex items-center justify-between transition-colors ${newPriority === key ? 'bg-black/5 font-bold' : ''}`}
                      >
                        {label}
                        {newPriority === key && <CheckCircle className="w-4 h-4 text-black" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 mt-2 border-t border-black/10">
                <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTicketId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 fade-in duration-300 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold uppercase tracking-tighter mb-2">Delete Ticket</h3>
            <p className="text-sm text-black/60 font-sans mb-8">
              Are you sure you want to permanently delete this ticket? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setDeleteTicketId(null)}
                className="flex-1 bg-black/5 text-black py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

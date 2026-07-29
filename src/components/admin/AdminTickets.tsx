import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Ticket, Plus, MessageSquare, Clock, CheckCircle, Trash2, Send, X, AlertCircle } from 'lucide-react';

type DeveloperTicket = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  created_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string };
};

export default function AdminTickets() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  const [tickets, setTickets] = useState<DeveloperTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTicket, setActiveTicket] = useState<DeveloperTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      if (user.email === 'tomfox@admin.com') {
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

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*, profiles(first_name, last_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
      
    if (data) {
      setMessages(data as TicketMessage[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const openTicket = (t: DeveloperTicket) => {
    setActiveTicket(t);
    fetchMessages(t.id);
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
      
    if (data) {
      setTickets([data as DeveloperTicket, ...tickets]);
      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('normal');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: activeTicket.id,
        sender_id: currentUser.id,
        message: replyText
      })
      .select('*, profiles(first_name, last_name)')
      .single();
      
    if (data) {
      setMessages([...messages, data as TicketMessage]);
      setReplyText('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
    if (!confirm('Are you sure you want to permanently delete this ticket?')) return;
    
    const { error } = await supabase
      .from('developer_tickets')
      .delete()
      .eq('id', ticketId);
      
    if (!error) {
      setTickets(tickets.filter(t => t.id !== ticketId));
      if (activeTicket?.id === ticketId) {
        setActiveTicket(null);
      }
    }
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
            {/* Chat Header */}
            <div className="p-6 border-b border-black/10 bg-[#fafafa] flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{activeTicket.title}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${activeTicket.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {activeTicket.status}
                  </span>
                </div>
                <p className="text-sm text-black/60 max-w-2xl">{activeTicket.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isClient && (
                  <button 
                    onClick={() => handleResolve(activeTicket.id, activeTicket.status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeTicket.status === 'resolved' ? 'bg-black/10 text-black hover:bg-black/20' : 'bg-green-500 text-white hover:bg-green-600'}`}
                  >
                    {activeTicket.status === 'resolved' ? 'Reopen Ticket' : 'Mark Resolved'}
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(activeTicket.id)}
                  className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                  title="Delete Ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#f0f0f0] flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="text-center text-black/40 my-8 text-sm">No messages yet.</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`p-4 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-black text-white rounded-tr-sm' : 'bg-white border border-black/10 rounded-tl-sm'}`}>
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-black/40 mt-1 px-1">
                        {!isMe && (msg.profiles?.first_name || 'System')} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-black/10 shrink-0">
              <form onSubmit={handleSendReply} className="flex gap-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-black/30 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim()}
                  className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-black/10 flex justify-between items-center bg-[#fafafa]">
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
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Priority</label>
                <select 
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full border border-black/20 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors bg-white"
                >
                  <option value="low">Low (Whenever possible)</option>
                  <option value="normal">Normal</option>
                  <option value="high">High (Important)</option>
                  <option value="urgent">Urgent (Platform is broken)</option>
                </select>
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
    </div>
  );
}

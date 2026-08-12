import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Search, Filter, Loader2, Eye, X, Mail, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface LicensingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  website_url: string;
  business_type: string;
  project_details: string;
  content_focus_ad: boolean;
  paid_ad_campaign: boolean;
  contains_sponsorships: boolean;
  monetized: boolean;
  paywalled: boolean;
  timeline: string;
  track_id: string | null;
  status: string;
  tracks?: { file_name: string } | null;
}

interface DropdownOption {
  value: string;
  label: string;
  colorClass?: string;
}

function CustomDropdown({
  value,
  options,
  onChange,
  className = '',
  dropdownWidth = 'w-full',
  isFilter = false
}: {
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  className?: string;
  dropdownWidth?: string;
  isFilter?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer flex items-center justify-between transition-all ${className} ${isOpen ? (isFilter ? 'border-black ring-1 ring-black' : 'ring-2 ring-offset-1 ring-[#3B82F6]') : ''}`}
      >
        <span className="truncate mr-2">{selectedOpt.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className={`absolute z-50 ${dropdownWidth} mt-2 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden py-1 animate-fade-in-up right-0`}>
          {options.map((option) => (
            <div 
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${value === option.value ? 'bg-black/5 text-black font-medium' : 'text-black/70 hover:bg-black/5 hover:text-black'}`}
            >
              {option.colorClass && (
                <div className={`w-2 h-2 rounded-full ${option.colorClass}`} />
              )}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLicensing() {
  const [requests, setRequests] = useState<LicensingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<LicensingRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('licensing_requests')
        .select(`*, tracks(file_name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching licensing requests:', err);
      toast.error('Failed to load licensing requests');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('licensing_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
      toast.success('Status updated');
      
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const deleteRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this request? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('licensing_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setRequests(prev => prev.filter(req => req.id !== id));
      toast.success('Request deleted');
      
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error('Error deleting request:', err);
      toast.error('Failed to delete request');
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.tracks?.file_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Licensing Requests</h1>
          <p className="text-[#6B7280] text-sm mt-1">Review and manage incoming sync licensing inquiries.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-black/5 p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input 
            type="text" 
            placeholder="Search by name, email, or track..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <CustomDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'replied', label: 'Replied' },
              { value: 'closed', label: 'Closed' }
            ]}
            className="px-4 py-2 bg-white border border-black/10 rounded-xl text-[11px] uppercase tracking-widest font-semibold focus:outline-none min-w-[140px]"
            isFilter
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-black/5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4">Track</th>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6] mx-auto" />
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6B7280] text-sm">
                    No licensing requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-black/[0.02] transition-colors group">
                    <td className="px-6 py-4 text-sm text-[#4B5563] whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[#111827]">{req.name}</div>
                      <div className="text-xs text-[#6B7280]">{req.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[#111827]">
                        {req.tracks?.file_name || <span className="text-[#9CA3AF] italic">General Request</span>}
                      </div>
                      <div className="text-xs text-[#6B7280] truncate max-w-[150px]" title={req.business_type}>
                        {req.business_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4B5563]">
                      {req.timeline}
                    </td>
                    <td className="px-6 py-4">
                      <CustomDropdown
                        value={req.status}
                        onChange={(val) => updateStatus(req.id, val)}
                        options={[
                          { value: 'pending', label: 'Pending', colorClass: 'bg-yellow-500' },
                          { value: 'replied', label: 'Replied', colorClass: 'bg-blue-500' },
                          { value: 'closed', label: 'Closed', colorClass: 'bg-gray-500' }
                        ]}
                        className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 border ${
                          req.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          req.status === 'replied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          req.status === 'closed' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}
                        dropdownWidth="w-32"
                      />
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="p-1.5 text-[#6B7280] hover:text-[#3B82F6] hover:bg-blue-50 rounded-lg transition-colors mr-2"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Requester Info</h3>
                  <p className="text-base font-semibold text-gray-900">{selectedRequest.name}</p>
                  <a href={`mailto:${selectedRequest.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <Mail className="w-3.5 h-3.5" /> {selectedRequest.email}
                  </a>
                  {selectedRequest.website_url && (
                    <a href={selectedRequest.website_url.startsWith('http') ? selectedRequest.website_url : `https://${selectedRequest.website_url}`} target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:underline block mt-1">
                      {selectedRequest.website_url}
                    </a>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <CustomDropdown
                    value={selectedRequest.status}
                    onChange={(val) => updateStatus(selectedRequest.id, val)}
                    options={[
                      { value: 'pending', label: 'Pending', colorClass: 'bg-yellow-500' },
                      { value: 'replied', label: 'Replied', colorClass: 'bg-blue-500' },
                      { value: 'closed', label: 'Closed', colorClass: 'bg-gray-500' }
                    ]}
                    className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 border w-max ${
                      selectedRequest.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      selectedRequest.status === 'replied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedRequest.status === 'closed' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}
                    dropdownWidth="w-32"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Project Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Requested Track</span>
                    <span className="text-sm font-medium text-gray-900">{selectedRequest.tracks?.file_name || 'General Request'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Business Type</span>
                    <span className="text-sm font-medium text-gray-900">{selectedRequest.business_type}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Timeline</span>
                    <span className="text-sm font-medium text-gray-900">{selectedRequest.timeline}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Date Submitted</span>
                    <span className="text-sm font-medium text-gray-900">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Usage Flags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.content_focus_ad && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-medium">Advertising/Promote</span>}
                  {selectedRequest.paid_ad_campaign && <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-medium">Paid Ad Campaign</span>}
                  {selectedRequest.contains_sponsorships && <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-medium">Contains Sponsorships</span>}
                  {selectedRequest.monetized && <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg text-xs font-medium">Monetized</span>}
                  {selectedRequest.paywalled && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-medium">Paywalled</span>}
                  {!selectedRequest.content_focus_ad && !selectedRequest.paid_ad_campaign && !selectedRequest.contains_sponsorships && !selectedRequest.monetized && !selectedRequest.paywalled && (
                    <span className="text-sm text-gray-500 italic">No special usage flags selected.</span>
                  )}
                </div>
              </div>

              {selectedRequest.project_details && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Project Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedRequest.project_details}
                  </div>
                </div>
              )}
              
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => deleteRequest(selectedRequest.id)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete Request
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

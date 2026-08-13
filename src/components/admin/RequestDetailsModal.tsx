import React, { useState, useEffect } from 'react';
import { X, Mail, Trash2 } from 'lucide-react';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import CustomDropdown from '../CustomDropdown';
import type { LicensingRequest } from './AdminLicensing';

type RequestDetailsModalProps = {
  request: LicensingRequest;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
};

export default function RequestDetailsModal({ request, onClose, onUpdateStatus, onDelete }: RequestDetailsModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const { isMounted, isAnimating } = useModalAnimation(internalIsOpen);

  useEffect(() => {
    if (!internalIsOpen && !isMounted) {
      onClose();
    }
  }, [internalIsOpen, isMounted, onClose]);

  const handleClose = () => setInternalIsOpen(false);

  if (!isMounted) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isAnimating ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`absolute inset-0 bg-black/60 transition-all duration-500 ease-out ${isAnimating ? 'backdrop-blur-sm opacity-100' : 'backdrop-blur-none opacity-0'}`} 
        onClick={handleClose} 
      />
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transition-all duration-500 ease-out ${isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Requester Info</h3>
              <p className="text-base font-semibold text-gray-900">{request.name}</p>
              <a href={`mailto:${request.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                <Mail className="w-3.5 h-3.5" /> {request.email}
              </a>
              {request.website_url && (
                <a href={request.website_url.startsWith('http') ? request.website_url : `https://${request.website_url}`} target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:underline block mt-1">
                  {request.website_url}
                </a>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <CustomDropdown
                value={request.status}
                onChange={(val) => onUpdateStatus(request.id, val)}
                options={[
                  { value: 'pending', label: 'Pending', colorClass: 'bg-yellow-500' },
                  { value: 'replied', label: 'Replied', colorClass: 'bg-blue-500' },
                  { value: 'closed', label: 'Closed', colorClass: 'bg-gray-500' }
                ]}
                className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 border w-max ${
                  request.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  request.status === 'replied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  request.status === 'closed' ? 'bg-gray-50 text-gray-700 border-gray-200' :
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
                <span className="text-sm font-medium text-gray-900">{request.tracks?.file_name || 'General Request'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Business Type</span>
                <span className="text-sm font-medium text-gray-900">{request.business_type}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Timeline</span>
                <span className="text-sm font-medium text-gray-900">{request.timeline}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Date Submitted</span>
                <span className="text-sm font-medium text-gray-900">{new Date(request.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Usage Flags</h3>
            <div className="flex flex-wrap gap-2">
              {request.content_focus_ad && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-medium">Advertising/Promote</span>}
              {request.paid_ad_campaign && <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-medium">Paid Ad Campaign</span>}
              {request.contains_sponsorships && <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-medium">Contains Sponsorships</span>}
              {request.monetized && <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg text-xs font-medium">Monetized</span>}
              {request.paywalled && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-medium">Paywalled</span>}
              {!request.content_focus_ad && !request.paid_ad_campaign && !request.contains_sponsorships && !request.monetized && !request.paywalled && (
                <span className="text-sm text-gray-500 italic">No special usage flags selected.</span>
              )}
            </div>
          </div>

          {request.project_details && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Project Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                {request.project_details}
              </div>
            </div>
          )}
          
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={() => onDelete(request.id)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete Request
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

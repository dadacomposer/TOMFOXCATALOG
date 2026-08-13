import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { X, ChevronDown, User, FileText, DollarSign, Calendar, Search, UserPlus } from 'lucide-react';
import { useModalAnimation } from '../../hooks/useModalAnimation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allUsers: any[];
}

export default function CreateSubscriptionModal({ isOpen, onClose, onSuccess, allUsers }: Props) {
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  const { isMounted, isAnimating } = useModalAnimation(internalIsOpen);

  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!internalIsOpen && !isMounted) {
      onClose();
    }
  }, [internalIsOpen, isMounted, onClose]);

  const handleClose = () => {
    setInternalIsOpen(false);
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // User Form
  const [existingUserId, setExistingUserId] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');

  // Subscription Form
  const [subscriptionTitle, setSubscriptionTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [interval, setInterval] = useState('month');

  // UI States
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isIntervalOpen, setIsIntervalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const currencyRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUsers = allUsers.filter(u => {
    if (!clientSearch) return true;
    const search = clientSearch.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return fullName.includes(search) || u.email?.toLowerCase().includes(search) || u.organization?.toLowerCase().includes(search);
  });

  const currencyOptions = [
    { value: 'usd', label: 'USD' },
    { value: 'eur', label: 'EUR' },
    { value: 'gbp', label: 'GBP' }
  ];

  const intervalOptions = [
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (intervalRef.current && !intervalRef.current.contains(event.target as Node)) {
        setIsIntervalOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if (val.split('.').length > 2) val = val.replace(/\.+$/, '');
    if (val.includes('.')) {
      const parts = val.split('.');
      val = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num)) val = num.toLocaleString('en-US', { minimumFractionDigits: val.includes('.') ? val.split('.')[1].length : 0, maximumFractionDigits: 2 });
    }
    setAmount(val);
  };

  const resetForm = () => {
    setIsNewUser(false);
    setExistingUserId('');
    setClientSearch('');
    setEmail('');
    setFirstName('');
    setLastName('');
    setOrganization('');
    setSubscriptionTitle('');
    setAmount('');
    setCurrency('usd');
    setInterval('month');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!subscriptionTitle || !amount) {
      toast.error("Please fill in all subscription details");
      return;
    }
    if (isNewUser && (!email || !firstName)) {
      toast.error("Email and First Name are required for new users");
      return;
    }
    if (!isNewUser && !existingUserId) {
      toast.error("Please select an existing user");
      return;
    }

    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Please enter a valid numeric amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-subscription', {
        body: {
          isNewUser,
          email: isNewUser ? email : allUsers.find(u => u.id === existingUserId)?.email,
          firstName,
          lastName,
          organization,
          existingUserId,
          subscriptionTitle,
          amount: numericAmount,
          currency,
          interval
        }
      });
      
      if (error) throw error;
      
      const invoiceUrl = data?.invoiceUrl;
      if (invoiceUrl) {
        toast.success(
          <div>
            Subscription created! <a href={invoiceUrl} target="_blank" rel="noreferrer" className="underline font-bold">Open Stripe Invoice</a>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success("Subscription created successfully!");
      }
      onSuccess();
      resetForm();
      handleClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ${isAnimating ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/60 transition-all duration-500 ease-out ${isAnimating ? 'backdrop-blur-sm opacity-100' : 'backdrop-blur-none opacity-0'}`} onClick={handleClose} />
      <div className={`relative z-10 bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-500 ease-out ${isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        {/* Header */}
        <div className="relative bg-[#fafafa] p-8 pb-6 border-b border-black/5 shrink-0">
            <button 
              onClick={() => {
                handleClose();
              }}
              className="absolute top-6 right-6 text-black/40 hover:text-black transition-colors"
            >
            <X className="w-6 h-6" />
          </button>
          
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">Create Subscription</h2>
            <p className="text-black/50 font-sans">Set up a new recurring subscription. We will generate the invoice and invite the client automatically.</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto overflow-x-hidden">
          <div className="p-8 flex flex-col gap-8">
            
            {/* User Selection */}
            <div className="flex flex-col gap-6">
              <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" />
                Client Details
              </h3>

              <div className="flex bg-black/5 p-1 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setIsNewUser(false)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${!isNewUser ? 'bg-white shadow-sm text-black' : 'text-black/50 hover:text-black'}`}
                >
                  Existing User
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewUser(true)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isNewUser ? 'bg-white shadow-sm text-black' : 'text-black/50 hover:text-black'}`}
                >
                  New User
                </button>
              </div>

              {isNewUser ? (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">First Name *</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-medium outline-none transition-all" placeholder="John" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Last Name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-medium outline-none transition-all" placeholder="Doe" />
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Email Address *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-medium outline-none transition-all" placeholder="john@example.com" />
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Organization</label>
                    <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-medium outline-none transition-all" placeholder="Company Name" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 animate-fade-in">
                  <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Select User *</label>
                  <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                    <div 
                      className="w-full bg-white border border-black/10 focus-within:border-black/30 rounded-2xl flex items-center px-4 transition-all"
                    >
                      <Search className="w-4 h-4 text-black/40 mr-2" />
                      <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setIsDropdownOpen(true);
                          if (existingUserId) setExistingUserId('');
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className="w-full bg-transparent py-4 text-sm font-medium outline-none"
                        autoComplete="off"
                      />
                      <ChevronDown className="w-4 h-4 text-black/40 ml-2" />
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden z-20 flex flex-col max-h-64">
                        <div className="flex-grow overflow-y-auto">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setExistingUserId(u.id);
                                  setClientSearch(`${u.first_name || ''} ${u.last_name || ''} (${u.email})`.trim());
                                  setIsDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-black/5 flex flex-col gap-0.5 transition-colors"
                              >
                                <span className="font-bold text-sm">{(u.first_name || '') + ' ' + (u.last_name || '')}</span>
                                <span className="text-xs text-black/50">{u.email}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-black/50">No clients found.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-black/5"></div>

            {/* Subscription Details */}
            <div className="flex flex-col gap-6">
              <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Subscription Details
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Subscription Title *</label>
                <input 
                  type="text" 
                  value={subscriptionTitle} 
                  onChange={e => setSubscriptionTitle(e.target.value)}
                  placeholder="e.g. Tom Fox Custom Library Access"
                  className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-medium outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Recurring Amount *</label>
                  <div className="flex gap-2">
                    <div className="relative w-24 shrink-0" ref={currencyRef}>
                      <button
                        type="button"
                        onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                        className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-bold uppercase tracking-widest outline-none transition-all flex items-center justify-between"
                      >
                        <span className="text-black">
                          {currencyOptions.find(o => o.value === currency)?.label || 'USD'}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-black/40 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isCurrencyOpen && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden z-20 flex flex-col">
                          {currencyOptions.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => { setCurrency(option.value); setIsCurrencyOpen(false); }}
                              className={`p-4 text-sm font-bold text-left hover:bg-black/5 transition-colors ${currency === option.value ? 'bg-black/5 text-black' : 'text-black/60'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative flex-grow">
                      <input 
                        type="text" 
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-medium outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3"/> Billing Interval *</label>
                  <div className="relative w-full" ref={intervalRef}>
                    <button
                      type="button"
                      onClick={() => setIsIntervalOpen(!isIntervalOpen)}
                      className="w-full bg-white border border-black/10 focus:border-black/30 rounded-2xl p-4 text-sm font-bold uppercase tracking-widest outline-none transition-all flex items-center justify-between"
                    >
                      <span className="text-black">
                        {intervalOptions.find(o => o.value === interval)?.label || 'Monthly'}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-black/40 transition-transform ${isIntervalOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isIntervalOpen && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden z-20 flex flex-col">
                        {intervalOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => { setInterval(option.value); setIsIntervalOpen(false); }}
                            className={`p-4 text-sm font-bold text-left hover:bg-black/5 transition-colors ${interval === option.value ? 'bg-black/5 text-black' : 'text-black/60'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 bg-[#FAFAFA]/95 backdrop-blur-md border-t border-black/5 p-6 flex justify-end gap-3 z-10">
          <button
            onClick={handleClose}
            className="px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest text-black/60 hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 bg-black text-white rounded-full text-sm font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            {isSubmitting ? 'Creating...' : 'Create Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}

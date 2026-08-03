import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Play, Plus, Search, ExternalLink, Settings2, UploadCloud, MonitorPlay, MessageCircle, ChevronDown, UserPlus, Lock, Unlock, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import AdminTheater from './AdminTheater';

export default function AdminTomFoxStudio() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // Create Project Modal State
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [existingUserId, setExistingUserId] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [daysUntilDue, setDaysUntilDue] = useState('7');
  const [projectType, setProjectType] = useState('');
  const [createInvoice, setCreateInvoice] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [theaterProjectId, setTheaterProjectId] = useState<string | null>(null);

  // Combobox state
  const [clientSearch, setClientSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isProjectTypeOpen, setIsProjectTypeOpen] = useState(false);
  const projectTypeRef = useRef<HTMLDivElement>(null);

  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);

  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const termsRef = useRef<HTMLDivElement>(null);

  const projectTypeOptions = [
    { value: 'film', label: 'Film' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'tv-broadcast', label: 'TV / Broadcast' },
    { value: 'social', label: 'Social' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'podcast-audiobook', label: 'Podcast / Audiobook' }
  ];

  const currencyOptions = [
    { value: 'usd', label: 'USD' },
    { value: 'eur', label: 'EUR' },
    { value: 'gbp', label: 'GBP' }
  ];

  const termsOptions = [
    { value: '7', label: 'Net 7 (Due in 7 days)' },
    { value: '15', label: 'Net 15 (Due in 15 days)' },
    { value: '30', label: 'Net 30 (Due in 30 days)' },
    { value: '60', label: 'Net 60 (Due in 60 days)' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (projectTypeRef.current && !projectTypeRef.current.contains(event.target as Node)) {
        setIsProjectTypeOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (termsRef.current && !termsRef.current.contains(event.target as Node)) {
        setIsTermsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!clientSearch) return allUsers;
    const lower = clientSearch.toLowerCase();
    return allUsers.filter(u => 
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    );
  }, [allUsers, clientSearch]);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      if (error) throw error;
      if (data && data.users) {
        setAllUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('tf_studio_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setProjects(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load studio projects");
    } finally {
      setLoading(false);
    }
  };

  const onHoldProjects = projects.filter(p => p.status === 'on hold');
  const acceptedProjects = projects.filter(p => p.status === 'accepted');
  const inProductionProjects = projects.filter(p => p.status === 'in production');
  const completedProjects = projects.filter(p => p.status === 'completed');

  const updateStatus = async (id: string, status: string) => {
    try {
      await supabase.from('tf_studio_projects').update({ status }).eq('id', id);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      toast.success(`Project moved to ${status}`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const resetForm = () => {
    setEmail(''); setFirstName(''); setLastName(''); setOrganization('');
    setExistingUserId(''); setProjectTitle(''); setAmount(''); setProjectType('');
    setCreateInvoice(false);
    setClientSearch('');
    setIsNewUser(false);
    setRequiresAuth(true);
  };

  const handleToggleAuth = async (projectId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('tf_studio_projects')
        .update({ requires_auth: !currentVal })
        .eq('id', projectId);
      
      if (error) throw error;
      toast.success(`Authentication ${!currentVal ? 'enabled' : 'disabled'} for project`);
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to update authentication");
    }
  };

  const handleCreateProject = async () => {
    if (!projectTitle || !projectType || (createInvoice && !amount)) {
      toast.error("Please fill in all project details");
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

    let numericAmount = 0;
    
    if (createInvoice) {
      numericAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Please enter a valid numeric amount");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-project', {
        body: {
          isNewUser,
          email,
          firstName,
          lastName,
          organization,
          existingUserId,
          projectTitle,
          amount: numericAmount,
          currency,
          daysUntilDue: parseInt(daysUntilDue),
          projectType,
          createInvoice,
          requiresAuth
        }
      }); if (error) throw error;
      
      const invoiceUrl = data?.invoiceUrl;
      if (invoiceUrl) {
        toast.success(
          <div>
            Project created! <a href={invoiceUrl} target="_blank" rel="noreferrer" className="underline font-bold">Open Stripe Invoice</a>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success("Project created successfully!");
      }
      setCreateModalOpen(false);
      fetchProjects();
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-project', {
        body: { projectId: projectToDelete }
      });
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectToDelete));
      setSelectedProject(null);
      setProjectToDelete(null);
      toast.success("Project deleted successfully");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  if (theaterProjectId) {
    return <AdminTheater projectId={theaterProjectId} onBack={() => setTheaterProjectId(null)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in font-outfit">
      
      {/* Header with DadaAudio Branding */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tom Fox Studio</h1>
          <p className="text-sm text-black/50 mt-1 flex items-center gap-2">
            Custom Music Commissions • Powered by 
            <span className="font-mono text-xs font-bold bg-black text-white px-2 py-0.5 rounded uppercase tracking-wider ml-1">
              DadaAudio
            </span>
          </p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black/80 transition-colors shadow-lg shadow-black/10"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      <div className="flex-grow overflow-x-auto">
        <div className="flex gap-6 h-full min-w-[900px] pb-8">
          {/* Accepted Column */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-black/40 flex items-center justify-between">
              Accepted <span className="bg-black/5 text-black px-2 py-0.5 rounded-full">{acceptedProjects.length}</span>
            </h3>
            <div className="flex-grow bg-blue-50/50 rounded-[24px] p-4 flex flex-col gap-3 overflow-y-auto border border-blue-100">
              {acceptedProjects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} onEnterTheater={() => setTheaterProjectId(p.id)} onToggleAuth={handleToggleAuth} />
              ))}
              {acceptedProjects.length === 0 && (
                <div className="text-center text-black/30 mt-10 text-sm font-medium">No accepted projects</div>
              )}
            </div>
          </div>

          {/* In Production Column */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-black/40 flex items-center justify-between">
              In Production <span className="bg-black/5 text-black px-2 py-0.5 rounded-full">{inProductionProjects.length}</span>
            </h3>
            <div className="flex-grow bg-purple-50/50 rounded-[24px] p-4 flex flex-col gap-3 overflow-y-auto border border-purple-100">
              {inProductionProjects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} onEnterTheater={() => setTheaterProjectId(p.id)} onToggleAuth={handleToggleAuth} />
              ))}
              {inProductionProjects.length === 0 && (
                <div className="text-center text-black/30 mt-10 text-sm font-medium">No active production</div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-black/40 flex items-center justify-between">
              Completed <span className="bg-black/5 text-black px-2 py-0.5 rounded-full">{completedProjects.length}</span>
            </h3>
            <div className="flex-grow bg-[#fafafa] rounded-[24px] p-4 flex flex-col gap-3 overflow-y-auto border border-black/5">
              {completedProjects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} onEnterTheater={() => setTheaterProjectId(p.id)} onToggleAuth={handleToggleAuth} />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative flex flex-col gap-8 my-auto">
            <button 
              onClick={() => {
                setCreateModalOpen(false);
                resetForm();
              }}
              className="absolute top-6 right-6 text-black/40 hover:text-black transition-colors"
            >
              ×
            </button>
            
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">Create Custom Music Project</h2>
              <p className="text-black/50 font-sans">Set up a new project. We will generate the invoice and invite the client automatically.</p>
            </div>

            <div className="flex flex-col gap-8">
              
              {/* Client Selection Section */}
              <div className="flex flex-col gap-4">
                {!isNewUser ? (
                  <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                    <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Select Client</label>
                    <div 
                      className="w-full bg-black/5 border border-transparent focus-within:border-black/20 focus-within:bg-white rounded-2xl flex items-center px-4 transition-all"
                    >
                      <Search className="w-4 h-4 text-black/40 mr-2" />
                      <input 
                        type="text"
                        name="client-search-dummy"
                        placeholder="Search by name or email..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setIsDropdownOpen(true);
                          if (existingUserId) setExistingUserId('');
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className="w-full bg-transparent p-4 pl-0 text-sm font-sans placeholder:text-black/30 outline-none"
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                      <ChevronDown className="w-4 h-4 text-black/40 ml-2" />
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden z-10 flex flex-col max-h-64">
                        <div className="flex-grow overflow-y-auto">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setExistingUserId(u.id);
                                  setClientSearch(`${u.first_name || ''} ${u.last_name || ''} (${u.email})`);
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
                        <div className="border-t border-black/5 bg-black/5 p-2 shrink-0">
                          <button
                            onClick={() => {
                              setIsNewUser(true);
                              setIsDropdownOpen(false);
                              if (clientSearch.includes('@')) setEmail(clientSearch);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-black text-black hover:text-white transition-colors py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                          >
                            <UserPlus className="w-3 h-3" />
                            Create New Client
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <button 
                      onClick={() => setIsNewUser(false)}
                      className="absolute -top-8 right-0 text-xs font-bold uppercase tracking-widest text-black/50 hover:text-black transition-colors"
                    >
                      ← Back to Search
                    </button>
                    
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Email Address</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="client@company.com"
                        className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">First Name</label>
                      <input 
                        type="text" 
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Last Name</label>
                      <input 
                        type="text" 
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Organization (Optional)</label>
                      <input 
                        type="text" 
                        value={organization}
                        onChange={e => setOrganization(e.target.value)}
                        className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-black/5" />

              {/* Project Details Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Project Title</label>
                  <input 
                    type="text" 
                    value={projectTitle}
                    onChange={e => setProjectTitle(e.target.value)}
                    placeholder="e.g. Nike Summer Campaign"
                    className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 relative" ref={projectTypeRef}>
                    <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Media Type</label>
                    <button
                      type="button"
                      onClick={() => setIsProjectTypeOpen(!isProjectTypeOpen)}
                      className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all flex items-center justify-between text-left"
                    >
                      <span className={projectType ? "text-black" : "text-black/40"}>
                        {projectTypeOptions.find(o => o.value === projectType)?.label || '-- Select --'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${isProjectTypeOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isProjectTypeOpen && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden z-10 flex flex-col">
                        {projectTypeOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setProjectType(option.value);
                              setIsProjectTypeOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-black/5 text-sm transition-colors ${projectType === option.value ? 'font-bold bg-black/5' : ''}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-[#fafafa] p-4 rounded-[20px] border border-black/5 mt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors ${requiresAuth ? 'bg-black text-white' : 'bg-black/10 text-transparent group-hover:bg-black/20'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={requiresAuth} 
                      onChange={(e) => setRequiresAuth(e.target.checked)} 
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold uppercase tracking-widest text-black/80">Requires Authentication</span>
                      {!requiresAuth && (
                         <span className="text-xs font-bold text-red-500 leading-tight">
                           Warning: Anyone with the project link will be able to view and influence this project without logging in.
                         </span>
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-black/5 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${createInvoice ? 'bg-black text-white' : 'bg-black/10 text-transparent group-hover:bg-black/20'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={createInvoice} 
                        onChange={(e) => setCreateInvoice(e.target.checked)} 
                      />
                      <span className="text-sm font-bold uppercase tracking-widest text-black/80">Create Invoice</span>
                    </label>

                    {createInvoice && (
                      <>
                        <div className="flex flex-col gap-2 animate-fade-in">
                          <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Invoice Amount</label>
                          <div className="flex gap-2">
                            <div className="relative w-24 shrink-0" ref={currencyRef}>
                              <button
                                type="button"
                                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                                className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-bold uppercase tracking-widest outline-none transition-all flex items-center justify-between"
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
                                      onClick={() => {
                                        setCurrency(option.value);
                                        setIsCurrencyOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 hover:bg-black/5 text-sm font-bold uppercase transition-colors ${currency === option.value ? 'bg-black/5' : ''}`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <input 
                              type="number" 
                              value={amount}
                              onChange={e => setAmount(e.target.value)}
                              placeholder="5000"
                              className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 animate-fade-in relative" ref={termsRef}>
                          <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Payment Terms</label>
                          <button
                            type="button"
                            onClick={() => setIsTermsOpen(!isTermsOpen)}
                            className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all flex items-center justify-between text-left"
                          >
                            <span className="text-black">
                              {termsOptions.find(o => o.value === daysUntilDue)?.label || 'Net 7'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${isTermsOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isTermsOpen && (
                            <div className="absolute bottom-full mb-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden z-20 flex flex-col">
                              {termsOptions.map(option => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setDaysUntilDue(option.value);
                                    setIsTermsOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 hover:bg-black/5 text-sm transition-colors ${daysUntilDue === option.value ? 'font-bold bg-black/5' : ''}`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

            </div>

            <div className="bg-black/5 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <label className="text-xs uppercase font-bold tracking-widest block mb-1">Requires Authentication</label>
                <p className="text-[10px] text-black/50 font-sans pr-4">If disabled, anyone with the link can access this project without logging in.</p>
              </div>
              <button 
                type="button"
                onClick={() => setRequiresAuth(!requiresAuth)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${requiresAuth ? 'bg-black' : 'bg-black/20'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${requiresAuth ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <button 
              onClick={handleCreateProject}
              disabled={isSubmitting}
              className="w-full bg-black text-white p-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* Panoramic Project Details Modal */}
      {selectedProject && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-xl p-8 md:p-12 shadow-2xl relative flex flex-col gap-8 my-auto">
            <button 
              onClick={() => setSelectedProject(null)}
              className="absolute top-6 right-6 text-black/40 hover:text-black transition-colors"
            >
              ×
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-black/60">
                  {selectedProject.status}
                </span>
                <span className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-black/60">
                  {selectedProject.project_type}
                </span>
              </div>
              <h2 className="text-3xl font-bold uppercase tracking-tighter">{selectedProject.title}</h2>
              {selectedProject.budget && selectedProject.budget !== '0' && selectedProject.budget !== 0 && (
                <p className="text-black/50 font-medium text-sm mt-1">${selectedProject.budget}</p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-black/5 p-4 rounded-2xl border border-black/5">
                <label className="text-[10px] text-black/50 uppercase font-bold tracking-widest block mb-2">Client Invite Link</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/studio/${selectedProject.id}`}
                    className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-black/70 font-mono outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/studio/${selectedProject.id}`);
                      toast.success("Link copied!");
                    }}
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-black/40 mt-2">Send this link to the client. They will be prompted to log in.</p>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                {selectedProject.status === 'accepted' && (
                  <button 
                    onClick={() => { updateStatus(selectedProject.id, 'in production'); setSelectedProject(null); }}
                    className="w-full bg-blue-500 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-blue-600 transition-colors"
                  >
                    Move to In Production
                  </button>
                )}
                {selectedProject.status === 'in production' && (
                  <button 
                    onClick={() => { updateStatus(selectedProject.id, 'completed'); setSelectedProject(null); }}
                    className="w-full bg-purple-500 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-purple-600 transition-colors"
                  >
                    Move to Completed
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    setTheaterProjectId(selectedProject.id);
                  }}
                  className="w-full bg-black text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-black/90 transition-colors flex items-center justify-center gap-2"
                >
                  Enter Admin Theater <ExternalLink className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => setProjectToDelete(selectedProject.id)}
                  className="w-full bg-red-50 text-red-600 p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-red-100 transition-colors mt-4"
                >
                  Delete Project
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative flex flex-col gap-6 text-center animate-scale-in">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tighter mb-2">Delete Project?</h3>
              <p className="text-black/50 font-sans text-sm">
                Are you sure you want to delete this project? All assets, invoices, and comments will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-6 py-4 rounded-full font-bold uppercase tracking-widest text-xs bg-black/5 text-black hover:bg-black/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProject}
                disabled={isDeleting}
                className="flex-1 px-6 py-4 rounded-full font-bold uppercase tracking-widest text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

function ProjectCard({ project, onClick, onEnterTheater, onToggleAuth }: { project: any, onClick: () => void, onEnterTheater: () => void, onToggleAuth: (id: string, current: boolean) => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-[20px] shadow-sm border border-black/5 flex flex-col gap-3 group hover:border-black/20 hover:shadow-md transition-all cursor-pointer relative"
    >
      <div className="flex justify-between items-start">
        <h4 className="font-bold truncate pr-2">{project.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleAuth(project.id, project.requires_auth);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${project.requires_auth ? 'bg-black/5 text-black/40 hover:bg-black hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
            title={project.requires_auth ? "Disable Authentication" : "Enable Authentication"}
          >
            {project.requires_auth ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEnterTheater();
            }}
            className="w-8 h-8 rounded-full bg-black/5 text-black hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Enter Admin Theater"
          >
            <MonitorPlay className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-black/50 font-medium">
        <span>{new Date(project.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

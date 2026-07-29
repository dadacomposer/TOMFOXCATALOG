import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | SelectGroup)[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "", searchable = false, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedLabel = () => {
    for (const opt of options) {
      if ('options' in opt) {
        const found = opt.options.find(o => o.value === value);
        if (found) return found.label;
      } else {
        if (opt.value === value) return opt.label;
      }
    }
    return placeholder;
  };

  return (
    <div className={`relative ${className}${disabled ? ' opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between h-11 bg-black/5 border border-black/10 rounded-xl px-4 text-[13px] font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="truncate">{getSelectedLabel()}</span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-80 animate-in fade-in slide-in-from-top-2 duration-200">
          {searchable && (
            <div className="p-2 border-b border-black/5 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/5 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-black/20 focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>
            </div>
          )}
          <div className="p-2 overflow-y-auto flex-grow">
            {options.map((item, idx) => {
              if ('options' in item) {
                const filteredOptions = item.options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()));
                if (filteredOptions.length === 0) return null;
                return (
                  <div key={idx} className="mb-3 last:mb-0">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black/40">
                      {item.label}
                    </div>
                    {filteredOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                          value === opt.value 
                            ? 'bg-black text-white font-medium' 
                            : 'hover:bg-black/5 text-black'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {value === opt.value && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                );
              } else {
                if (!item.label.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg transition-colors mb-1 last:mb-0 ${
                      value === item.value 
                        ? 'bg-black text-white font-medium' 
                        : 'hover:bg-black/5 text-black'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {value === item.value && <Check className="w-4 h-4" />}
                  </button>
                );
              }
            })}
            {options.length > 0 && searchQuery && !options.some(item => 
              'options' in item 
                ? item.options.some(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
                : item.label.toLowerCase().includes(searchQuery.toLowerCase())
            ) && (
              <div className="px-3 py-4 text-center text-sm text-black/40">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-black/10 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-tight hover:border-black/30 transition-colors focus:outline-none"
      >
        <span className="truncate">{getSelectedLabel()}</span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {options.map((item, idx) => {
              if ('options' in item) {
                return (
                  <div key={idx} className="mb-3 last:mb-0">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black/40">
                      {item.label}
                    </div>
                    {item.options.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-left rounded-lg transition-colors ${
                          value === opt.value 
                            ? 'bg-black text-white' 
                            : 'hover:bg-black/5 text-black'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {value === opt.value && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                );
              } else {
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-left rounded-lg transition-colors mb-1 last:mb-0 ${
                      value === item.value 
                        ? 'bg-black text-white' 
                        : 'hover:bg-black/5 text-black'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {value === item.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
}

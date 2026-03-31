import React, { useState, useRef, useEffect } from 'react';

type AutocompleteInputProps = {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export function AutocompleteInput({ value, onChange, suggestions, placeholder, className, required }: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.trim()) {
      const match = suggestions.filter(s => s.toLowerCase().startsWith(val.toLowerCase()));
      setFiltered(match);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (s: string) => {
    onChange(s);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        required={required}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.trim()) {
            const match = suggestions.filter(s => s.toLowerCase().startsWith(value.toLowerCase()));
            setFiltered(match);
            if (match.length > 0) setIsOpen(true);
          } else {
            setFiltered(suggestions.slice(0, 5)); // show top 5 by default
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className || "w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"}
      />
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto animate-slide-up">
          {filtered.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(item)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-slate-800 border-b border-slate-100 last:border-0 transition-colors"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

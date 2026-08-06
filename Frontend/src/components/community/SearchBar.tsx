import React, { useState, useEffect, useRef } from 'react';
import { Search, Flame, Clock } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const RECENT_SEARCHES = [
  "Mahlet Solomon",
  "Software Engineering",
  "AASTU"
];

const TRENDING_SEARCHES = [
  "Operating Systems students",
  "Exit Exam 2025 group",
  "Database Systems"
];

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleSelectSearch = (term: string) => {
    setQuery(term);
    setIsFocused(false);
    onSearch(term);
  };

  return (
    <div className="relative w-full mx-auto flex justify-center" ref={containerRef}>
      <div 
        className={`relative transition-all duration-200 ease-in-out z-20 ${
          isFocused ? 'w-[102%]' : 'w-full'
        }`}
      >
        <div className="relative flex items-center w-full h-12 rounded-xl bg-white border border-border shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <div className="pl-4 pr-3 text-muted-foreground">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="flex-1 h-full bg-transparent outline-none text-[15px] placeholder:text-muted-foreground/70"
            placeholder="Search students by name, university, department, or course..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>

        {/* Dropdown */}
        <div 
          ref={dropdownRef}
          className={`absolute top-full left-0 w-full mt-2 bg-white rounded-xl border border-border shadow-lg overflow-hidden transition-all duration-200 ease-in-out origin-top ${
            isFocused ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
          }`}
        >
          {query.trim() === '' ? (
            <div className="p-2">
              <div className="mb-2">
                <div className="px-3 py-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Searches
                </div>
                {RECENT_SEARCHES.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSearch(term)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-[14px] text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <Clock size={14} className="text-muted-foreground" />
                    {term}
                  </button>
                ))}
              </div>
              <div>
                <div className="px-3 py-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Trending <Flame size={14} className="text-orange-500" />
                </div>
                {TRENDING_SEARCHES.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSearch(term)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-[14px] text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <Search size={14} className="text-muted-foreground" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Press enter to see all results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;

import React, { useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search courses, subjects, creators...',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const recentSearches = ['Operating Systems', 'Database Normalization', 'Mahlet'];

  return (
    <div className="relative w-full max-w-xl mx-auto z-40">
      <motion.div
        animate={{ 
          scale: isFocused ? 1.02 : 1,
          boxShadow: isFocused ? '0 10px 25px -5px rgba(0, 0, 0, 0.05)' : '0 0px 0px rgba(0, 0, 0, 0)'
        }}
        className="relative"
      >
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${isFocused ? 'text-teal-600' : 'text-stone-400'}`} />
        <input
          type="text"
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-stone-100/50 border border-stone-200/40 rounded-2xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-all duration-300"
        />
      </motion.div>

      <AnimatePresence>
        {isFocused && !value && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 bg-white/90 backdrop-blur-xl border border-stone-200/50 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-3 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Recent Searches</div>
            {recentSearches.map((item) => (
              <button
                key={item}
                onClick={() => onChange(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-xl transition-colors text-left"
              >
                <Clock className="w-3.5 h-3.5 text-stone-300" />
                {item}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ReplyComposerProps {
  onPost: (content: string) => void;
  placeholder?: string;
}

const ReplyComposer: React.FC<ReplyComposerProps> = ({
  onPost,
  placeholder = 'Write a reply…',
}) => {
  const [value, setValue] = useState('');

  const handlePost = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onPost(trimmed);
    setValue('');
  };

  return (
    <div className="flex items-end gap-2 pt-3 mt-3 border-t border-stone-100">
      <div className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
        AL
      </div>
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
        />
      </div>
      <button
        onClick={handlePost}
        disabled={!value.trim()}
        className="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        aria-label="Post reply"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ReplyComposer;

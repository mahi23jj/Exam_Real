import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../../types/workspace';

interface FollowUpChatProps {
  questionText: string;
}

export const FollowUpChat: React.FC<FollowUpChatProps> = ({ questionText }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'ai',
          content: `Great follow-up! Regarding "${questionText.slice(0, 50)}...", the key insight is to connect this concept to real exam scenarios. This is a private AI response — not shared publicly.`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setTyping(false);
    }, 1000);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Follow-up Chat</p>

      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto no-scrollbar space-y-2">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-700 text-white'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && (
            <div className="flex gap-1 px-3 py-2">
              <span className="w-1 h-1 rounded-full bg-stone-400 typing-dot" />
              <span className="w-1 h-1 rounded-full bg-stone-400 typing-dot" />
              <span className="w-1 h-1 rounded-full bg-stone-400 typing-dot" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a follow-up question..."
          className="flex-1 px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || typing}
          className="px-3 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FollowUpChat;

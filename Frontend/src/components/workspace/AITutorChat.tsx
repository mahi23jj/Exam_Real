import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../../types/workspace';

interface AITutorChatProps {
  contextText: string;
  onBack: () => void;
}

const INITIAL_AI: ChatMessage = {
  id: 'ai-init',
  role: 'ai',
  content: 'I can help explain this passage. What would you like to know?',
  timestamp: new Date().toISOString(),
};

export const AITutorChat: React.FC<AITutorChatProps> = ({ contextText, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_AI]);
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
          content: `Based on "${contextText.slice(0, 60)}${contextText.length > 60 ? '...' : ''}", here's what I can tell you: this concept is fundamental to understanding the topic. Would you like me to break it down further or connect it to exam questions?`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setTyping(false);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full -m-4"
    >
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-stone-800">Ask AI</span>
        </div>
        <button onClick={onBack} className="text-xs font-semibold text-stone-400 hover:text-stone-600">
          Back
        </button>
      </div>

      <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex-shrink-0">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Context</p>
        <p className="text-xs text-stone-600 italic line-clamp-2">"{contextText}"</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-700 text-white rounded-br-md'
                    : 'bg-stone-100 text-stone-700 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typing && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-stone-100 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-stone-100 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a follow-up..."
          className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || typing}
          className="px-3 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default AITutorChat;

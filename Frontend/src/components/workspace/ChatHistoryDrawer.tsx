import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatConversation } from '../../types/workspace';

interface ChatHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  conversations: ChatConversation[];
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  open,
  onClose,
  conversations,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = ['Today', 'Yesterday', 'This Week', 'Older'] as const;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white premium-shadow flex flex-col"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="text-base font-semibold text-stone-800">Chat History</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
              {groups.map((group) => {
                const items = conversations.filter((c) => c.dateGroup === group);
                if (items.length === 0) return null;
                return (
                  <section key={group}>
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                      {group}
                    </h3>
                    <div className="space-y-2">
                      {items.map((conv) => (
                        <div key={conv.id} className="rounded-xl border border-stone-100 overflow-hidden">
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === conv.id ? null : conv.id)
                            }
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 transition-colors"
                          >
                            {expandedId === conv.id ? (
                              <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-stone-700 truncate">{conv.preview}</p>
                              <p className="text-xs text-stone-400 mt-0.5">
                                {conv.messages.length} messages · {conv.timestamp}
                              </p>
                            </div>
                          </button>

                          <AnimatePresence initial={false}>
                            {expandedId === conv.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden border-t border-stone-50"
                              >
                                <div className="p-3 space-y-2 bg-stone-50/50">
                                  {conv.messages.map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div
                                        className={`max-w-[90%] px-2.5 py-2 rounded-lg text-xs ${
                                          msg.role === 'user'
                                            ? 'bg-teal-700 text-white'
                                            : 'bg-white text-stone-700 border border-stone-100'
                                        }`}
                                      >
                                        {msg.content}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              {conversations.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-8">No conversations yet.</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryDrawer;

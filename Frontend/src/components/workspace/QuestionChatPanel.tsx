import React, { useState } from 'react';
import type { Comment } from '../../types/workspace';

type QuestionChatPanelProps = {
  onClose: () => void;
  // In a real implementation, questions and replies would be fetched via API.
  // For now we accept an optional initial list of comments.
  initialComments?: Comment[];
};

export const QuestionChatPanel: React.FC<QuestionChatPanelProps> = ({ onClose, initialComments = [] }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newReply, setNewReply] = useState('');

  const handlePost = () => {
    if (!newReply.trim()) return;
    const newComment: Comment = {
      id: `${Date.now()}`,
      author: { id: 'me', name: 'You', initials: 'Y' },
      content: newReply,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    setComments([...comments, newComment]);
    setNewReply('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b p-2">
        <h2 className="text-sm font-medium">Question Chat</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:text-neutral-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="border rounded p-2 bg-neutral-50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">{c.author.name}</span>
              <span className="text-xs text-neutral-400">{new Date(c.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm mb-1">{c.content}</p>
            <button className="text-xs text-primary-600 flex items-center gap-1">
              👍 <span>{c.likes}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="p-2 border-t flex gap-2">
        <textarea
          className="flex-1 border rounded p-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
          placeholder="Write a reply…"
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
        />
        <button
          type="button"
          className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
          onClick={handlePost}
        >
          Send
        </button>
      </div>
    </div>
  );
};

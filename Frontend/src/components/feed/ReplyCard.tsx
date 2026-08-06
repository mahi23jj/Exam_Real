import React from 'react';

const ReplyCard: React.FC<{
  author: { name: string; initials: string };
  content: string;
  createdAt: string;
  likes: number;
  replies?: Array<{ id: string; author: { name: string; initials: string }; content: string; createdAt: string; likes: number; replies?: any[] }>;
  depth?: number;
}> = ({ author, content, createdAt, likes, replies = [], depth = 0 }) => {
  const [likeCount, setLikeCount] = React.useState(likes);
  const [liked, setLiked] = React.useState(false);

  return (
    <div className={`${depth > 0 ? 'ml-5 pl-4 border-l border-stone-100' : ''}`}>
      <div className="flex items-start gap-2.5 py-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[9px] font-bold text-stone-500">
          {author.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-stone-700">{author.name}</span>
            <span className="text-[10px] text-stone-400">{createdAt}</span>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">{content}</p>
          <button
            onClick={() => {
              const next = !liked;
              setLiked(next);
              setLikeCount(c => next ? c + 1 : c - 1);
            }}
            className={`mt-1.5 flex items-center gap-1 text-[10px] transition-colors duration-200 ${
              liked ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'
            }`}
          >
            ♥ {likeCount}
          </button>
        </div>
      </div>
      {replies.length > 0 && (
        <div>
          {replies.map((r) => (
            <ReplyCard key={r.id} {...r} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReplyCard;

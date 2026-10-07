import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Library, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { FeedScope } from '../../services/socialService';

interface EmptyFeedStateProps {
  /** Lets the copy match why the feed is empty. */
  scope?: FeedScope;
  /** Person filter from the Following rail; null means the combined feed. */
  selectedAuthorId?: string | null;
}

const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({
  scope = 'everyone',
  selectedAuthorId = null,
}) => {
  const navigate = useNavigate();
  const person = selectedAuthorId !== null;
  const following = scope === 'following';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-teal-50 text-teal-700 shadow-sm">
        {person || following ? <Users className="h-7 w-7" /> : <Library className="h-7 w-7" />}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-stone-800">
        {person
          ? 'No posts from this person yet'
          : following
            ? 'Nothing from your follows yet'
            : 'No posts here yet'}
      </h3>
      <p className="mb-6 max-w-sm text-sm leading-6 text-stone-500">
        {person
          ? "They haven't posted any questions or knowledge pins that match this view yet. Clear the person filter to see everyone you follow."
          : following
            ? 'Follow classmates and their questions and pins will appear here, alongside your own posts.'
            : 'Ask a question or pin a note while you study and it will show up here.'}
      </p>

      <button
        onClick={() => navigate(following ? '/community' : '/courses')}
        className="flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-800"
      >
        <BookOpen className="h-4 w-4" />
        {following ? 'Find people to follow' : 'Explore Courses'}
      </button>
    </motion.div>
  );
};

export default EmptyFeedState;
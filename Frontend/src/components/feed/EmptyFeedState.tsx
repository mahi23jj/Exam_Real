import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmptyFeedState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-[58vh] flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-teal-50 text-teal-700 shadow-sm">
        <Library className="h-7 w-7" />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-stone-800">No recommendations yet</h3>
      <p className="mb-6 max-w-sm text-sm leading-6 text-stone-500">
        Start following courses or interact with learning materials to personalize your feed.
      </p>

      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-800"
      >
        <BookOpen className="w-4 h-4" />
        Explore Courses
      </button>
    </motion.div>
  );
};

export default EmptyFeedState;

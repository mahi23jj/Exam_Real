import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface SuccessStepProps {
  notesCount: number;
  examsCount: number;
  onViewCourse: () => void;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ notesCount, examsCount, onViewCourse }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onViewCourse();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onViewCourse]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle className="w-12 h-12 text-emerald-500" />
      </motion.div>
      
      <motion.h2 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-stone-800 mb-4"
      >
        Course Created Successfully!
      </motion.h2>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-stone-500 mb-8 max-w-sm"
      >
        Your course is now live. You uploaded {notesCount} notes and {examsCount} past exams.
      </motion.p>
      
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onViewCourse}
        className="px-8 py-4 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 transition-all shadow-lg shadow-teal-900/20"
      >
        View Course
      </motion.button>
    </motion.div>
  );
};

export default SuccessStep;

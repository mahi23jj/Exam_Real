import React, { useState } from 'react';
import { X, Globe, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CourseCard from './CourseCard';

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onCreate({ name, description, visibility });
    setIsLoading(false);
    setName('');
    setDescription('');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row"
          >
            {/* Form Section */}
            <div className="flex-1 p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-stone-800">New Course</h2>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Course Name</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Advanced Algorithms"
                    className="w-full px-0 py-2 text-xl font-semibold bg-transparent border-b-2 border-stone-100 focus:border-teal-600 focus:outline-none transition-colors placeholder:text-stone-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will students learn?"
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/10 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    {visibility === 'public' ? <Globe className="w-5 h-5 text-teal-600" /> : <Lock className="w-5 h-5 text-stone-400" />}
                    <div>
                      <div className="text-sm font-bold text-stone-800 capitalize">{visibility}</div>
                      <div className="text-[10px] text-stone-500">{visibility === 'public' ? 'Anyone can join' : 'Invite only'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${visibility === 'public' ? 'bg-teal-600' : 'bg-stone-300'}`}
                  >
                    <motion.div 
                      animate={{ x: visibility === 'public' ? 26 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-4 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!name.trim() || isLoading}
                    className="flex-[2] py-4 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="hidden sm:flex flex-1 bg-stone-50 p-10 items-center justify-center border-l border-stone-100">
              <div className="w-full max-w-xs">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-6 text-center">Live Preview</div>
                <CourseCard
                  variant="mine"
                  title={name || 'Course Title'}
                  description={description || 'Your course description will appear here...'}
                  creator="You"
                  students={0}
                  materials={0}
                  tag={visibility === 'public' ? 'Public' : 'Private'}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCourseModal;
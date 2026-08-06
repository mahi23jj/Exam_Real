import React, { useEffect } from 'react';
import { X, BookOpen, Pin, MessageCircle, Check, ArrowRight } from 'lucide-react';
import type { UserProfile } from '../community/UserCard';

interface ProfilePreviewProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onViewFullProfile: (userId: string) => void;
}

const ProfilePreview: React.FC<ProfilePreviewProps> = ({ user, isOpen, onClose, onViewFullProfile }) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-[4px] z-40 transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div 
        className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 sticky top-0 bg-white z-10">
          <h2 className="text-[16px] font-semibold text-foreground">Profile Preview</h2>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1">
          {/* User Info */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-semibold text-2xl premium-shadow">
              {user.initials}
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800 leading-tight">
                {user.name}
              </h3>
              <p className="text-[14px] text-stone-500 mt-1">
                {user.department} &middot; {user.university}
              </p>
            </div>
          </div>

          <p className="text-[14px] text-stone-500 italic mb-6">
            Passionate about teaching and building study tools.
          </p>

          {/* Interests */}
          <div className="mb-8">
            <h4 className="text-[13px] font-bold text-stone-400 uppercase tracking-widest mb-3">
              Learning Interests
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1.5 bg-stone-100/50 rounded-lg text-[13px] text-stone-500"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            className={`
              w-full h-10 rounded-2xl text-[14px] font-bold transition-all duration-200 flex items-center justify-center gap-2 mb-8
              ${user.isFollowing 
                ? 'bg-transparent text-teal-700 border border-teal-700/30 hover:bg-teal-50' 
                : 'bg-teal-700 text-white premium-shadow hover:bg-teal-800 hover:scale-[1.01] active:scale-[0.99]'
              }
            `}
          >
            {user.isFollowing ? (
              <>Following <Check size={16} /></>
            ) : (
              '+ Follow'
            )}
          </button>

          {/* Stats Divider */}
          <div className="border-t border-stone-200/50 pt-6 mb-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col items-center gap-1 text-stone-500">
                <BookOpen size={20} className="text-teal-700 mb-1" />
                <span className="text-[18px] font-bold text-stone-800">{user.stats.courses}</span>
                <span className="text-[12px] font-medium">Courses</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-stone-500">
                <Pin size={20} className="text-teal-700 mb-1" />
                <span className="text-[18px] font-bold text-stone-800">{user.stats.pins}</span>
                <span className="text-[12px] font-medium">Pins</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-stone-500">
                <MessageCircle size={20} className="text-teal-700 mb-1" />
                <span className="text-[18px] font-bold text-stone-800">{user.stats.questions}</span>
                <span className="text-[12px] font-medium">Questions</span>
              </div>
            </div>
          </div>

          {/* Recent Pin preview */}
          <div className="mb-8">
             <h4 className="text-[13px] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Pin size={14} className="text-teal-700" />
              Recent Knowledge Pin
            </h4>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50">
              <p className="text-[14px] text-stone-800 italic">
                "Virtual memory uses disk space as extension of RAM"
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border/50 mt-auto bg-white/80 backdrop-blur-md">
          <button 
            onClick={() => onViewFullProfile(user.id)}
            className="w-full h-11 bg-transparent hover:bg-muted/50 border border-border rounded-xl text-[14px] font-medium transition-colors flex items-center justify-center gap-2"
          >
            View Full Profile
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfilePreview;

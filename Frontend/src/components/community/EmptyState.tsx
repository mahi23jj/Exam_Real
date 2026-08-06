import React from 'react';
import { UserPlus } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  subtitle, 
  actionLabel, 
  onAction 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-in fade-in zoom-in-95 duration-500 ease-out">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
        {icon || <UserPlus size={32} />}
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-[15px] text-muted-foreground max-w-md mb-8 leading-relaxed">
        {subtitle}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="h-10 px-6 bg-primary text-white rounded-xl font-medium text-[15px] shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

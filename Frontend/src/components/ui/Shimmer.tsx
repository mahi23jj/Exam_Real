import React from 'react';

export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-stone-100 rounded-xl ${className}`}>
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
      }}
    />
  </div>
);

export const ShimmerText: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Shimmer className={`h-4 rounded ${className}`} />
);

export const ShimmerCircle: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Shimmer className={`rounded-full ${className}`} />
);

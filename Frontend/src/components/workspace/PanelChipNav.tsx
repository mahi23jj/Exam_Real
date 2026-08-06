import React from 'react';

export interface PanelChip {
  id: string;
  label: string;
  count?: number;
}

interface PanelChipNavProps {
  chips: PanelChip[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const PanelChipNav: React.FC<PanelChipNavProps> = ({
  chips,
  activeId,
  onSelect,
  className = '',
}) => (
  <div className={`flex gap-2 p-3 overflow-x-auto no-scrollbar ${className}`}>
    {chips.map((chip) => {
      const isActive = activeId === chip.id;
      return (
        <button
          key={chip.id}
          onClick={() => onSelect(chip.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98] ${
            isActive
              ? 'bg-teal-700 text-white premium-shadow'
              : 'bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-700'
          }`}
        >
          {chip.label}
          {chip.count !== undefined && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {chip.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default PanelChipNav;

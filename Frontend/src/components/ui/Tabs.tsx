import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  activeTab: T;
  onChange: (id: T) => void;
  tabs: TabItem<T>[];
  layoutId?: string;
}

export const Tabs = <T extends string>({ activeTab, onChange, tabs, layoutId = "activeTab" }: TabsProps<T>) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-stone-100/50 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-teal-800'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-white premium-shadow rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
          {tab.count !== undefined && (
            <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
              activeTab === tab.id ? 'bg-teal-50 text-teal-700' : 'bg-stone-200/50 text-stone-400'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;

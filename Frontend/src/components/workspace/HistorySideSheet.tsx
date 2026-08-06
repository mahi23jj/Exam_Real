import React from 'react';
import type { KnowledgePin, PublicQuestion } from '../../types/workspace';

type HistoryItem =
  | { type: 'pin'; data: KnowledgePin }
  | { type: 'question'; data: PublicQuestion };

type HistorySideSheetProps = {
  onClose: () => void;
  items?: HistoryItem[]; // optional, defaults to empty
};

export const HistorySideSheet: React.FC<HistorySideSheetProps> = ({ onClose, items = [] }) => {
  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black bg-opacity-30" onClick={onClose} />
      {/* Side sheet */}
      <aside className="w-80 max-w-full bg-white shadow-lg flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <h2 className="text-sm font-medium">History</h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-700"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-neutral-400">No history yet.</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="border rounded p-2 bg-neutral-50">
                {item.type === 'pin' ? (
                  <>
                    <div className="text-xs font-bold">Pin</div>
                    <div className="text-sm">{item.data.type.replace('_', ' ')}</div>
                    <div className="text-xs text-neutral-600" title={item.data.anchorText}>
                      {item.data.anchorText.slice(0, 30)}…
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold">Question</div>
                    <div className="text-xs" title={item.data.anchorText}>
                      {item.data.anchorText.slice(0, 30)}…
                    </div>
                    <div className="text-xs text-neutral-600">{item.data.content.slice(0, 40)}…</div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

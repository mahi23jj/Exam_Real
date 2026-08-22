import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PinType } from '../../types/workspace';
import type { ApiVisibility } from '../../services/socialService';

const PIN_TYPES: { value: PinType; label: string }[] = [
  { value: 'memory_trick', label: 'Memory Trick' },
  { value: 'explanation', label: 'Explanation' },
  { value: 'exam_hint', label: 'Exam Tip' },
  { value: 'warning', label: 'Warning' },
  { value: 'common_mistake', label: 'Common Mistake' },
  { value: 'implementation_tip', label: 'Implementation Tip' },
  { value: 'formula_tip', label: 'Formula Tip' },
  { value: 'other', label: 'Other' },
];

const VISIBILITY_OPTIONS: { value: ApiVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'FOLLOWERS_ONLY', label: 'Followers Only' },
  { value: 'PRIVATE', label: 'Private' },
];

interface CreatePinPanelProps {
  selectedText: string;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    type: PinType;
    note: string;
    anchorText: string;
    visibility: ApiVisibility;
  }) => void;
  saving?: boolean;
}

export const CreatePinPanel: React.FC<CreatePinPanelProps> = ({
  selectedText,
  onCancel,
  onSave,
  saving = false,
}) => {
  const [title, setTitle] = useState(selectedText.slice(0, 80));
  const [note, setNote] = useState('');
  const [type, setType] = useState<PinType>('explanation');
  const [visibility, setVisibility] = useState<ApiVisibility>('PUBLIC');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
    >
      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">
          Selected Text
        </label>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-600 italic leading-relaxed"
        >
          "{selectedText}"
        </motion.div>
      </div>

      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short title for this pin"
          className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">
          Your Note
        </label>
        <motion.textarea
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your insight, memory trick, or tip..."
          rows={3}
          className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">
          Pin Type
        </label>
        <motion.select
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          value={type}
          onChange={(e) => setType(e.target.value as PinType)}
          className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 bg-white"
        >
          {PIN_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </motion.select>
      </div>

      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">
          Visibility
        </label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ApiVisibility)}
          className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 bg-white"
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2 pt-2"
      >
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              title: title.trim() || selectedText.slice(0, 80),
              type,
              note,
              anchorText: selectedText,
              visibility,
            })
          }
          disabled={saving || (!note.trim() && !title.trim())}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all duration-150 hover:scale-[1.02] hover:premium-shadow active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Pin'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default CreatePinPanel;

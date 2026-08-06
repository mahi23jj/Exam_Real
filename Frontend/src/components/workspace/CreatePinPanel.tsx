import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PinType } from '../../types/workspace';

const PIN_TYPES: { value: PinType; label: string }[] = [
  { value: 'memory_trick', label: 'Memory Trick' },
  { value: 'implementation_tip', label: 'Implementation Tip' },
  { value: 'exam_hint', label: 'Exam Hint' },
  { value: 'warning', label: 'Warning' },
  { value: 'explanation', label: 'Explanation' },
];

interface CreatePinPanelProps {
  selectedText: string;
  onCancel: () => void;
  onSave: (data: { type: PinType; note: string; anchorText: string }) => void;
}

export const CreatePinPanel: React.FC<CreatePinPanelProps> = ({
  selectedText,
  onCancel,
  onSave,
}) => {
  const [note, setNote] = useState('');
  const [type, setType] = useState<PinType>('memory_trick');

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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2 pt-2"
      >
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ type, note, anchorText: selectedText })}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all duration-150 hover:scale-[1.02] hover:premium-shadow active:scale-[0.98]"
        >
          Save Pin
        </button>
      </motion.div>
    </motion.div>
  );
};

export default CreatePinPanel;

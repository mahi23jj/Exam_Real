import React from 'react';
import { Pin, HelpCircle, Sparkles, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import PanelChipNav from './PanelChipNav';
import KnowledgePinCard from './KnowledgePinCard';
import type { NoteDocument, NotesChipTab, KnowledgePin, PublicQuestion } from '../../types/workspace';

interface NotesContextPanelProps {
  document: NoteDocument;
  activeTab: NotesChipTab;
  onTabChange: (tab: NotesChipTab) => void;
  onLocatePin: (pin: KnowledgePin) => void;
  onLocateQuestion: (question: PublicQuestion) => void;
}

const NotesContextPanel: React.FC<NotesContextPanelProps> = ({
  document,
  activeTab,
  onTabChange,
  onLocatePin,
  onLocateQuestion,
}) => {
  const chips = [
    { id: 'guide', label: 'Guide' },
    { id: 'pins', label: 'Knowledge Pins', count: document.pins.length },
    { id: 'questions', label: 'Questions', count: document.questions.length },
  ];

  return (
    <div className="flex flex-col h-full -mx-4 -mt-4">
      <PanelChipNav chips={chips} activeId={activeTab} onSelect={(id) => onTabChange(id as NotesChipTab)} />

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4">
        {activeTab === 'guide' && <GuideTab document={document} />}
        {activeTab === 'pins' && (
          <PinsTab pins={document.pins} onLocate={onLocatePin} />
        )}
        {activeTab === 'questions' && (
          <QuestionsTab questions={document.questions} onLocate={onLocateQuestion} />
        )}
      </div>
    </div>
  );
};

const GuideTab: React.FC<{ document: NoteDocument }> = ({ document }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="space-y-5"
  >
    <div>
      <h3 className="text-base font-semibold text-stone-800 mb-1">{document.name.replace('.pdf', '')}</h3>
      <p className="text-sm text-stone-500 leading-relaxed">
        {document.sections.length} sections · {document.pins.length} pins · {document.questions.length} questions
      </p>
    </div>

    <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Select text to:</p>
      <div className="space-y-3">
        <GuideItem icon={Pin} label="Create Knowledge Pin" color="text-amber-600" />
        <GuideItem icon={HelpCircle} label="Ask Question" color="text-sky-600" />
        <GuideItem icon={Sparkles} label="Ask AI" color="text-teal-600" />
      </div>
    </div>

    <p className="text-xs text-stone-400">
      Press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono">F</kbd> for focus mode.
    </p>
  </motion.div>
);

const GuideItem: React.FC<{ icon: React.ElementType; label: string; color: string }> = ({
  icon: Icon,
  label,
  color,
}) => (
  <div className="flex items-center gap-3">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-sm text-stone-700">{label}</span>
  </div>
);

const PinsTab: React.FC<{
  pins: KnowledgePin[];
  onLocate: (pin: KnowledgePin) => void;
}> = ({ pins, onLocate }) => (
  <div className="space-y-3">
    {pins.length === 0 ? (
      <p className="text-sm text-stone-400 py-4">No knowledge pins yet. Select text to create one.</p>
    ) : (
      pins.map((pin, idx) => (
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
        >
          <KnowledgePinCard
            pin={pin}
            onClick={() => onLocate(pin)}
            showLocateAction
          />
        </motion.div>
      ))
    )}
  </div>
);

const QuestionsTab: React.FC<{
  questions: PublicQuestion[];
  onLocate: (question: PublicQuestion) => void;
}> = ({ questions, onLocate }) => (
  <div className="space-y-3">
    {questions.length === 0 ? (
      <p className="text-sm text-stone-400 py-4">No questions yet. Select text to ask one.</p>
    ) : (
      questions.map((q, idx) => (
        <motion.button
          key={q.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
          onClick={() => onLocate(q)}
          className="w-full text-left p-4 rounded-xl border border-stone-100 bg-white hover:border-stone-200 hover:-translate-y-0.5 hover:premium-shadow transition-all duration-200"
        >
          <p className="text-xs text-stone-400 italic mb-1 line-clamp-1">"{q.anchorText}"</p>
          <p className="text-sm text-stone-700 font-medium mb-2">{q.content}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">{q.author.name} · {q.createdAt}</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-teal-700">
              <MapPin className="w-3 h-3" />
              Click to locate
            </span>
          </div>
          {q.replies.length > 0 && (
            <span className="text-xs text-stone-400 mt-1 block">{q.replies.length} replies</span>
          )}
        </motion.button>
      ))
    )}
  </div>
);

export default NotesContextPanel;

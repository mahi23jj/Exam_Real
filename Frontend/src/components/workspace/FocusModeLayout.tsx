import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FocusModeLayoutProps {
  focusMode: boolean;
  onExitFocus: () => void;
  header: React.ReactNode;
  explorer: React.ReactNode;
  document: React.ReactNode;
  context: React.ReactNode;
  floatingToolbar?: React.ReactNode;
}

const EDGE_THRESHOLD = 48;
const REVEAL_DELAY = 300;

const FocusModeLayout: React.FC<FocusModeLayoutProps> = ({
  focusMode,
  onExitFocus,
  header,
  explorer,
  document,
  context,
  floatingToolbar,
}) => {
  const [revealedPanel, setRevealedPanel] = useState<'left' | 'right' | 'top' | null>(null);
  const revealTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!focusMode) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      let panel: 'left' | 'right' | 'top' | null = null;
      if (clientX < EDGE_THRESHOLD) panel = 'left';
      else if (clientX > innerWidth - EDGE_THRESHOLD) panel = 'right';
      else if (clientY < EDGE_THRESHOLD) panel = 'top';

      if (panel) {
        if (revealTimer.current) clearTimeout(revealTimer.current);
        setRevealedPanel(panel);
      } else {
        if (revealTimer.current) clearTimeout(revealTimer.current);
        revealTimer.current = setTimeout(() => setRevealedPanel(null), REVEAL_DELAY);
      }
    },
    [focusMode],
  );

  useEffect(() => {
    if (focusMode) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (revealTimer.current) clearTimeout(revealTimer.current);
      };
    }
    setRevealedPanel(null);
  }, [focusMode, handleMouseMove]);

  if (!focusMode) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 flex min-h-0">
          {explorer}
          <main className="flex-[3] min-w-0 relative">{document}{floatingToolbar}</main>
          {context}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative overflow-hidden bg-white">
      <main className="h-full relative z-0">{document}{floatingToolbar}</main>

      <AnimatePresence>
        {revealedPanel === 'top' && (
          <motion.div
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-30"
          >
            <div className="relative">
              {header}
              <button
                onClick={onExitFocus}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-stone-900 text-white rounded-lg text-xs font-bold"
              >
                Exit Focus
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealedPanel === 'left' && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 bottom-0 w-[280px] z-20 bg-white border-r border-stone-200 premium-shadow"
          >
            {explorer}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealedPanel === 'right' && (
          <motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-0 bottom-0 w-[320px] z-20 bg-white border-l border-stone-200 premium-shadow"
          >
            {context}
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <span className="px-3 py-1.5 bg-stone-900/80 text-white text-[10px] font-medium rounded-full backdrop-blur-sm">
          Focus mode · Move to edges to reveal panels · Press F to exit
        </span>
      </div>
    </div>
  );
};

export default FocusModeLayout;

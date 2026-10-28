import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function AgentHeader({
  selectedAgent,
  agents,
  isMenuOpen,
  onToggleMenu,
  onSelectAgent,
}) {
  return (
    <header className="relative z-30 flex items-center justify-between px-4 pb-2 pt-4">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <button onClick={onToggleMenu} className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-slate-900">
            <span>{selectedAgent}</span>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="mosaic-glass absolute left-0 top-full z-50 mt-2 w-48 rounded-[20px] p-2"
              >
                {agents.map((agent) => (
                  <button key={agent} onClick={() => onSelectAgent(agent)} className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-xs font-semibold ${selectedAgent === agent ? 'bg-cyan-500/10 font-bold text-cyan-600' : 'text-slate-700 hover:bg-slate-100'}`}>
                    <span>{agent}</span>{selectedAgent === agent && <Check size={12} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </header>
  );
}

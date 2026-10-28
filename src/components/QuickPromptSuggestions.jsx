import { motion } from 'framer-motion';

export default function QuickPromptSuggestions({ suggestions, onSelect, isCompact = false }) {
  return (
    <div aria-label="Quick prompt suggestions" className={`fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 overflow-x-auto px-1 scrollbar-none transition-[bottom] duration-300 ${isCompact ? 'bottom-[5.5rem]' : 'bottom-[9.5rem]'}`}>
      {suggestions.map(({ label, icon: Icon, prompt }) => (
        <motion.button
          key={label}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16, mass: 0.5 }}
          onClick={() => onSelect(prompt)}
          title={`Use suggestion: ${label}`}
          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200/60 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm shadow-slate-200/40 transition-all"
        >
          <Icon size={14} className="text-slate-500" />
          <span>{label}</span>
        </motion.button>
      ))}
    </div>
  );
}

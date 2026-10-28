import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, Ellipsis, MapPin, Search, Send, X } from 'lucide-react';

const memoryColors = [
  'from-cyan-200 via-sky-300 to-blue-400',
  'from-emerald-100 via-teal-200 to-cyan-400',
  'from-amber-100 via-orange-200 to-stone-400',
  'from-slate-300 via-slate-400 to-slate-600',
];

export default function CollectionDetail({ collection, onBack }) {
  const [tab, setTab] = useState('summary');
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [locationsOpen, setLocationsOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [notice, setNotice] = useState('');

  const isHongKong = /hong kong|\bhk\b/i.test(collection.title);
  const summary = isHongKong
    ? 'This collection focuses on Hong Kong tourism, covering practical information such as itinerary planning, attraction and food recommendations, and accommodation.'
    : `A collection of ${collection.memories} memories about ${collection.title}. Browse the highlights and saved moments from this collection.`;
  const memories = useMemo(() => Array.from({ length: Math.min(collection.memories || 4, 12) }, (_, index) => ({
    id: index,
    title: isHongKong ? ['Harbour ferry ride', 'A day in the city', 'Street market finds', 'Evening in Hong Kong'][index % 4] : `${collection.title} · Memory ${index + 1}`,
    color: memoryColors[index % memoryColors.length],
  })), [collection, isHongKong]);
  const visibleMemories = memories.filter((memory) => memory.title.toLowerCase().includes(search.toLowerCase()));

  const submitQuestion = (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setNotice(`Your question about “${collection.title}” is ready. Connect an AI provider to get a collection answer.`);
    setQuestion('');
    setAsking(false);
  };

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-hidden bg-[#F1F3F5] px-4 pb-28 pt-4 text-[#17191c] sm:px-6 lg:px-10">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button title="Back to collections" onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-95"><ArrowLeft size={20} /></button>
          <div className="min-w-0"><h1 className="truncate text-xl font-semibold">{collection.title}</h1><p className="text-xs text-slate-500">{collection.memories} Memories</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button title="Search memories" onClick={() => setSearchOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Search size={18} /></button>
          <button title="Collection options" onClick={() => setNotice('Collection options are coming soon.')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Ellipsis size={20} /></button>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && <motion.label initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"><Search size={17} className="text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this collection" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button title="Close search" onClick={() => { setSearchOpen(false); setSearch(''); }}><X size={16} /></button></motion.label>}
      </AnimatePresence>

      <div className="mb-5 grid grid-cols-2 rounded-full bg-[#E5E7E9] p-1 text-sm">
        <button onClick={() => setTab('summary')} className={`rounded-full px-3 py-2 font-medium transition ${tab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>✨&nbsp; Summarize</button>
        <button onClick={() => setTab('list')} className={`rounded-full px-3 py-2 font-medium transition ${tab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>☷&nbsp; Memory list</button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'summary' ? <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6">
          <section>
            <button onClick={() => setOverviewOpen((open) => !open)} className="mb-2 flex items-center gap-1 text-left text-base font-semibold">{overviewOpen ? <ChevronDown size={17} fill="currentColor" /> : <ChevronUp size={17} /> } Content Overview</button>
            <AnimatePresence initial={false}>{overviewOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="text-sm leading-relaxed text-slate-700">{summary}</p>
              <div className="mt-3 grid grid-cols-4 gap-1.5">{memoryColors.map((color, index) => <motion.div key={color} whileTap={{ scale: 0.96 }} className={`aspect-square rounded-xl bg-gradient-to-br ${color} shadow-sm`} aria-label={`Memory reference ${index + 1}`} />)}</div>
            </motion.div>}</AnimatePresence>
          </section>

          <div className="h-px bg-slate-200" />

          <section>
            <button onClick={() => setLocationsOpen((open) => !open)} className="mb-2 flex items-center gap-1 text-left text-base font-semibold">{locationsOpen ? <ChevronDown size={17} fill="currentColor" /> : <ChevronUp size={17} />} Relevant locations</button>
            <AnimatePresence initial={false}>{locationsOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="text-sm leading-relaxed text-slate-700">The locations mentioned in your memories have been marked on the map.</p>
              <div className="relative mt-3 h-36 overflow-hidden rounded-2xl border border-sky-100 bg-[#DDF1E9]">
                <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(28deg, transparent 46%, #fff 47%, #fff 51%, transparent 52%), linear-gradient(112deg, transparent 40%, #fff 41%, #fff 45%, transparent 46%), linear-gradient(0deg, transparent 48%, #bdddcf 49%, #bdddcf 52%, transparent 53%)', backgroundSize: '95px 74px, 120px 90px, 100% 62px' }} />
                <span className="absolute left-[17%] top-[28%] h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow" /><span className="absolute left-[62%] top-[56%] h-3 w-3 rounded-full border-2 border-white bg-rose-500 shadow" /><span className="absolute right-[15%] top-[22%] h-3 w-3 rounded-full border-2 border-white bg-violet-500 shadow" />
                <span className="absolute bottom-2 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600"><MapPin size={12} /> {isHongKong ? 'Hong Kong' : collection.title}</span>
              </div>
            </motion.div>}</AnimatePresence>
          </section>
        </motion.div> : <motion.section key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
          <h2 className="mb-3 text-base font-semibold">{search ? 'Search results' : 'All memories'}</h2>
          <div className="space-y-2">{visibleMemories.map((memory) => <article key={memory.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"><div className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${memory.color}`} /><div className="min-w-0"><p className="truncate text-sm font-medium">{memory.title}</p><p className="mt-1 text-xs text-slate-500">Saved in {collection.title}</p></div><Ellipsis size={18} className="ml-auto text-slate-400" /></article>)}{visibleMemories.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">No matching memories.</p>}</div>
        </motion.section>}
      </AnimatePresence>

      <button onClick={() => setAsking(true)} className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-semibold shadow-[0_8px_30px_rgba(15,23,42,0.14)] transition active:scale-95"><span className="text-base">✨</span> Ask about this collection</button>

      <AnimatePresence>
        {asking && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/20 p-4" onClick={() => setAsking(false)}><motion.form initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(event) => event.stopPropagation()} onSubmit={submitQuestion} className="w-full max-w-md rounded-[26px] bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Ask about {collection.title}</h2><button type="button" title="Close" onClick={() => setAsking(false)}><X size={18} /></button></div><div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-2"><input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask anything about these memories" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" /><button title="Send question" disabled={!question.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white disabled:opacity-30"><Send size={17} /></button></div></motion.form></motion.div>}
        {notice && <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setNotice('')} className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-left text-xs leading-relaxed text-white shadow-xl">{notice}</motion.button>}
      </AnimatePresence>
    </main>
  );
}

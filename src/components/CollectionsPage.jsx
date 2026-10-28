import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, Plus, Eye, Mic2 } from 'lucide-react';
import CollectionDetail from './CollectionDetail';

const STARTER_COLLECTIONS = [
  { title: 'Trip to HK', memories: 12, colors: ['from-sky-400 to-blue-700', 'from-cyan-300 to-slate-500', 'from-rose-400 to-red-800', 'from-emerald-300 to-teal-700'] },
  { title: 'Trip to Madrid', memories: 23, colors: ['from-orange-300 to-amber-700', 'from-rose-300 to-red-800', 'from-sky-300 to-blue-800', 'from-lime-300 to-emerald-700'] },
  { title: 'Best Movies', memories: 56, colors: ['from-indigo-300 to-slate-950', 'from-amber-200 to-slate-900', 'from-teal-300 to-slate-950', 'from-rose-300 to-stone-900'] },
  { title: 'My Music', memories: 134, colors: ['from-stone-400 to-black', 'from-orange-200 to-rose-800', 'from-amber-300 to-stone-900', 'from-violet-300 to-indigo-950'] },
  { title: 'Mount Fuji', memories: 2, colors: ['from-sky-200 to-blue-600', 'from-pink-200 to-rose-600', 'from-emerald-200 to-teal-700', 'from-slate-200 to-slate-700'] },
  { title: 'Trip to Mumbai', memories: 87, colors: ['from-orange-300 to-rose-700', 'from-sky-200 to-blue-700', 'from-lime-200 to-green-700', 'from-amber-200 to-stone-800'] },
];

export default function CollectionsPage({ onBack }) {
  const [collections, setCollections] = useState(STARTER_COLLECTIONS);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  const createCollection = (event) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setCollections((items) => [...items, { title, memories: 0, colors: ['from-cyan-300 to-blue-700', 'from-violet-200 to-indigo-700', 'from-lime-200 to-emerald-700', 'from-amber-200 to-rose-700'] }]);
    setNewTitle('');
    setIsCreating(false);
  };

  if (selectedCollection) {
    return <CollectionDetail collection={selectedCollection} onBack={() => setSelectedCollection(null)} />;
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-[#F3F5F7] px-4 pb-8 pt-4 text-slate-900 sm:px-6 lg:px-10">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button title="Back to chat" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-semibold">Collections</h1>
        </div>
        <div className="relative">
          <button title="More collection options" onClick={() => setShowMore((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><MoreVertical size={19} /></button>
          <AnimatePresence>
            {showMore && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl">
              <button onClick={() => { setCollections((items) => [...items].sort((a, b) => a.title.localeCompare(b.title))); setShowMore(false); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Sort by name</button>
              <button onClick={() => { setIsCreating(true); setShowMore(false); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Create collection</button>
            </motion.div>}
          </AnimatePresence>
        </div>
      </header>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold">Pin to Top</h2>
        <div className="grid max-w-3xl grid-cols-2 gap-3">
          <button onClick={() => setSelectedCollection({ title: 'Voice Memos', memories: 24, description: 'Have dinner with Mary tomorrow at 7pm.' })} className="min-h-40 rounded-[24px] bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]">
            <p className="text-xl font-bold leading-tight">24 <span className="text-sm font-semibold">Voice Memos</span></p>
            <p className="mt-1 text-xs leading-snug text-slate-500">Have dinner with Mary tomorrow at 7pm.</p>
            <div className="relative mt-3 h-10">
              <div className="absolute left-0 top-1 h-6 w-20 rounded-2xl rounded-bl-sm bg-slate-900" />
              <div className="absolute left-8 top-5 flex h-8 w-20 items-center justify-center rounded-2xl rounded-br-sm bg-violet-600 text-white"><Mic2 size={16} /></div>
            </div>
          </button>
          <button onClick={() => setShowExpenses(true)} className="min-h-40 rounded-[24px] bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]">
            <div className="flex items-center justify-between gap-1"><p className="truncate text-xl font-bold">₹42,662.1</p><Eye size={15} className="shrink-0 text-slate-500" /></div>
            <p className="mt-1 text-xs text-slate-500">Expenses this Month</p>
            <div className="mt-4 flex h-12 items-end gap-1 border-b border-l border-slate-200 px-1">
              {[30, 48, 24, 38, 34, 60, 44, 8].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-sky-500" style={{ height: `${height}%` }} />)}
            </div>
          </button>
        </div>
      </section>

      <section className="mt-7 flex-1">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Collections</h2>
          <button onClick={() => setIsCreating(true)} className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-slate-600 hover:bg-white"><Plus size={17} /> Create Collection</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {collections.map((collection) => (
            <motion.button key={collection.title} whileTap={{ scale: 0.97 }} onClick={() => setSelectedCollection(collection)} className="rounded-[24px] bg-white p-3.5 text-left shadow-sm transition-shadow hover:shadow-md">
              <h3 className="truncate text-base font-bold">{collection.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{collection.memories} Memories</p>
              <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
                {collection.colors.map((color, index) => <span key={index} className={`aspect-[1.55] bg-gradient-to-br ${color}`} />)}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {isCreating && (
          <Modal onClose={() => setIsCreating(false)}>
            <form onSubmit={createCollection}>
              <h2 className="text-lg font-semibold">Create Collection</h2>
              <input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Collection name" className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIsCreating(false)} className="rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={!newTitle.trim()} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Create</button></div>
            </form>
          </Modal>
        )}
        {showExpenses && <Modal onClose={() => setShowExpenses(false)}><h2 className="text-lg font-semibold">Expenses this Month</h2><p className="mt-2 text-sm text-slate-600">₹42,662.1</p><p className="mt-1 text-xs text-slate-500">Monthly expense summary</p></Modal>}
      </AnimatePresence>
    </main>
  );
}

function Modal({ children, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4">
      <motion.section initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl">{children}</motion.section>
    </motion.div>
  );
}

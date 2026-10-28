import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function ArtifactPreviewModal({ artifact, onClose, onCopy, onDownload }) {
  if (!artifact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mosaic-glass w-full max-w-sm rounded-[24px] p-5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-sm font-bold text-slate-900">{artifact.title}</h2><p className="mt-1 text-xs text-slate-500">{artifact.subtitle}</p></div>
          <button title="Close preview" onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{artifact.content || 'This demo folder plan is a preview only. No files were moved on your device.'}</pre>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onCopy(artifact.content || artifact.title)} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">Copy</button>
          {artifact.type === 'html' && <button onClick={() => onDownload(artifact)} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Download</button>}
        </div>
      </motion.section>
    </div>
  );
}

export default function StatusToast({ message }) {
  if (!message) return null;
  return <div role="status" className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">{message}</div>;
}

import React from 'react';
import { ChevronRight, Check, Copy, Share2, RotateCw, MoreHorizontal } from 'lucide-react';

export default function ConversationView({ messages, isBusy, onCopy, onShare, onReset, onMore, onOpenArtifact }) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-5 pb-56">
      <div className="flex items-center justify-end gap-2 text-slate-500">
        <button title="Copy conversation" onClick={onCopy} className="mosaic-glass-control rounded-full p-2"><Copy size={15} /></button>
        <button title="Share conversation" onClick={onShare} className="mosaic-glass-control rounded-full p-2"><Share2 size={15} /></button>
        <button title="New conversation" disabled={isBusy} onClick={onReset} className="mosaic-glass-control rounded-full p-2 disabled:opacity-40"><RotateCw size={15} /></button>
        <button title="More options" onClick={onMore} className="mosaic-glass-control rounded-full p-2"><MoreHorizontal size={15} /></button>
      </div>

      {messages.map((message) => (
        <React.Fragment key={message.id}>
          {message.type === 'user' && (
            <div className="flex justify-end">
              <div className="max-w-[92%] rounded-[22px] border border-white bg-white p-4 text-sm font-medium leading-relaxed text-slate-900 shadow-sm">{message.text}</div>
            </div>
          )}

          {message.type === 'agent' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5"><span className="text-base">🖐️</span><span className="text-sm font-bold text-slate-900">{message.agentName}</span></div>
                <span className="mosaic-glass-control flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"><Check size={11} />{message.status}<ChevronRight size={12} /></span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{message.text}</p>

              {message.artifacts?.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {message.artifacts.map((artifact) => {
                    const Icon = artifact.icon;
                    return (
                      <button key={artifact.id} onClick={() => onOpenArtifact(artifact)} title={artifact.type === 'html' ? 'Download HTML preview' : 'View workspace plan'} className="mosaic-glass flex w-full items-center justify-between rounded-[20px] p-3.5 text-left text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white ${artifact.accentColor}`}>{artifact.type === 'folder' ? <Icon size={20} /> : '</> HTML'}</div>
                          <div><h4 className="text-xs font-bold leading-tight">{artifact.title}</h4><p className="mt-0.5 text-[11px] text-slate-400">{artifact.subtitle}</p></div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

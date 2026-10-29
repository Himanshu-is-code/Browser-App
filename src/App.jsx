import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import AmbientFlow from './components/AmbientFlow';
import PhotoMosaicBackdrop from './components/PhotoMosaicBackdrop';
import AgentHeader from './components/AgentHeader';
import BottomActionDock from './components/BottomActionDock';
import ConversationView from './components/ConversationView';
import ArtifactPreviewModal from './components/ArtifactPreviewModal';
import StatusToast from './components/StatusToast';
import makePreviewHtml from './utils/makePreviewHtml';

const AGENTS = ['Agent', 'DeepSeek-V3', 'Gemini 1.5 Pro', 'ChatGPT-4o', 'Claude 3.5'];
export default function App() {
  const [selectedAgent, setSelectedAgent] = useState('Agent');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('input'); // 'input' | 'chat'
  const isBusy = false;
  const [notice, setNotice] = useState('');
  const [artifactPreview, setArtifactPreview] = useState(null);
  const [nativeBrowserOverlay, setNativeBrowserOverlay] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  useEffect(() => {
    const showDockOverPage = () => setNativeBrowserOverlay(true);
    const showMainPage = () => setNativeBrowserOverlay(false);
    window.addEventListener('browser:show-dock-overlay', showDockOverPage);
    window.addEventListener('browser:hide-dock-overlay', showMainPage);
    return () => {
      window.removeEventListener('browser:show-dock-overlay', showDockOverPage);
      window.removeEventListener('browser:hide-dock-overlay', showMainPage);
    };
  }, []);

  // Chat stream messages (for chat view mode)
  const [messages, setMessages] = useState([]);

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(showNotice.timeoutId);
    showNotice.timeoutId = window.setTimeout(() => setNotice(''), 2400);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotice('Copied to clipboard');
    } catch {
      showNotice('Clipboard access is unavailable in this browser');
    }
  };

  const handleShare = async () => {
    const text = messages.map((message) => `${message.agentName || 'You'}: ${message.text}`).join('\n\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'AI Mind Pilot conversation', text });
      } catch (error) {
        if (error.name !== 'AbortError') showNotice('Could not share this conversation');
      }
    } else {
      await handleCopy(text);
    }
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) {
      showNotice(`${files.length} file${files.length === 1 ? '' : 's'} selected`);
    }
    event.target.value = '';
  };

  const downloadArtifact = (artifact) => {
    if (artifact.type === 'folder') {
      setArtifactPreview(artifact);
      return;
    }
    const html = artifact.content || makePreviewHtml(artifact.title, artifact.subtitle);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.title;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice('HTML file downloaded');
  };

  return (
    <div
      className={`relative isolate flex min-h-screen w-full justify-center overflow-x-hidden font-sans text-slate-800 ${nativeBrowserOverlay ? 'bg-transparent' : 'bg-[#F3F5F7]'}`}
      style={nativeBrowserOverlay ? { backgroundColor: 'transparent' } : undefined}
    >
      {!nativeBrowserOverlay && <>
      <AmbientFlow />
      <PhotoMosaicBackdrop />

      {/* Full-bleed app surface; responsive content can still use a comfortable reading width. */}
      <div className="relative z-10 flex min-h-screen w-full flex-col">

        <>

        <AgentHeader
          selectedAgent={selectedAgent}
          agents={AGENTS}
          isMenuOpen={isHeaderMenuOpen}
          onToggleMenu={() => setIsHeaderMenuOpen((open) => !open)}
          onSelectAgent={(agent) => { setSelectedAgent(agent); setIsHeaderMenuOpen(false); }}
        />

        {/* 2. Main Canvas Container */}
        <main className="flex-1 flex flex-col px-4 pt-3 pb-4 max-w-md mx-auto w-full relative z-10 overflow-y-auto overscroll-y-contain scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          
          {/* MODE 2: ACTIVE CHAT CONVERSATION STREAM */}
          {viewMode === 'chat' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pb-56"
            >
              <ConversationView
                messages={messages}
                isBusy={isBusy}
                onCopy={() => handleCopy(messages.map((message) => `${message.agentName || 'You'}: ${message.text}`).join('\n\n'))}
                onShare={handleShare}
                onReset={() => { setMessages([]); setViewMode('input'); }}
                onMore={() => showNotice('Conversation is stored in this tab only')}
                onOpenArtifact={(artifact) => artifact.type === 'html' ? downloadArtifact(artifact) : setArtifactPreview(artifact)}
              />
            </motion.div>
          )}

        </main>

        </>

        <ArtifactPreviewModal
          artifact={artifactPreview}
          onClose={() => setArtifactPreview(null)}
          onCopy={handleCopy}
          onDownload={downloadArtifact}
        />
        <StatusToast message={notice} />
      </div>
      </>}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />
      <BottomActionDock
        onPhotos={() => fileInputRef.current?.click()}
        overlayMode={nativeBrowserOverlay}
        onCreate={() => {
          if (nativeBrowserOverlay && typeof window.CppEngine?.showShellPage === 'function') {
            window.CppEngine.showShellPage();
          }
        }}
      />
    </div>
  );
}

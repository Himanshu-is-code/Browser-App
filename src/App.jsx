import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, Code } from 'lucide-react';
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
  const [prompt, setPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('Agent');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('input'); // 'input' | 'chat'
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [artifactPreview, setArtifactPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  // Chat stream messages (for chat view mode)
  const [messages, setMessages] = useState([]);

  const handleSend = (text = prompt) => {
    const userText = text.trim();
    if (!userText || isBusy) return;
    const requestId = Date.now();
    const userMessage = { id: requestId, type: 'user', text: userText };
    const workingMessage = {
      id: requestId + 1,
      type: 'agent',
      agentName: selectedAgent === 'Agent' ? selectedSubAgent : selectedAgent,
      status: 'Working',
      text: 'Working through your request…',
      artifacts: [],
    };

    setMessages((prev) => [...prev, userMessage, workingMessage]);
    setPrompt('');
    setAttachments([]);
    setIsBusy(true);
    setViewMode('chat');

    setTimeout(() => {
      const cleanRequest = userText.replace(/[.!?]+$/, '');
      const title = cleanRequest.length > 54 ? `${cleanRequest.slice(0, 51)}…` : cleanRequest;
      const slug = userText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'mind-pilot-result';
      const result = {
        id: requestId + 1,
        type: 'agent',
        agentName: selectedAgent === 'Agent' ? selectedSubAgent : selectedAgent,
        status: 'Completed',
        text: `I’ve turned your request into a practical first draft: “${title}”. Review the suggested next steps below and adjust your prompt any time. This local demo does not access or move files on your device.${attachments.length ? ' Attached file names are noted, but their contents are not read.' : ''}`,
        artifacts: [
          {
            id: `art-${requestId}-folder`,
            type: 'folder',
            title: 'Workspace plan',
            subtitle: attachments.length ? `${attachments.length} attached name${attachments.length === 1 ? '' : 's'} · Just now` : 'Organized from your request · Just now',
            icon: Folder,
            accentColor: 'bg-cyan-500 text-white',
            content: `Request: ${userText}\n\nSuggested next steps:\n• Gather the relevant materials\n• Group related items under “${title}”\n• Review names and dates before saving`,
          },
          {
            id: `art-${requestId}-html`,
            type: 'html',
            title: `${slug}.html`,
            subtitle: 'HTML preview · Ready to download',
            icon: Code,
            accentColor: 'bg-blue-600 text-white',
            content: makePreviewHtml(title, userText),
          },
        ],
      };
      setMessages((prev) => prev.map((message) => message.id === requestId + 1 ? result : message));
      setIsBusy(false);
    }, 650);
  };

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
    const chosenFiles = Array.from(event.target.files || []);
    if (!chosenFiles.length) return;
    setAttachments((current) => [...current, ...chosenFiles.map((file) => ({ name: file.name, size: file.size }))]);
    showNotice(`${chosenFiles.length} file${chosenFiles.length === 1 ? '' : 's'} attached`);
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
    <div className="relative isolate flex min-h-screen w-full justify-center overflow-x-hidden bg-[#F3F5F7] font-sans text-slate-800">
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

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />

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
                onReset={() => { setMessages([]); setViewMode('input'); setPrompt(''); }}
                onMore={() => showNotice('Conversation is stored in this tab only')}
                onOpenArtifact={(artifact) => artifact.type === 'html' ? downloadArtifact(artifact) : setArtifactPreview(artifact)}
              />
            </motion.div>
          )}

        </main>

        <BottomActionDock onPhotos={() => fileInputRef.current?.click()} />

        </>

        <ArtifactPreviewModal
          artifact={artifactPreview}
          onClose={() => setArtifactPreview(null)}
          onCopy={handleCopy}
          onDownload={downloadArtifact}
        />
        <StatusToast message={notice} />
      </div>
    </div>
  );
}

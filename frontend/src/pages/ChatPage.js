import { useState, useEffect, useRef } from 'react';
import { chatAPI, statsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  PaperPlaneTilt, 
  Robot, 
  User, 
  Plus, 
  Trash, 
  Clock,
  FileText,
  ChatCircleDots,
  CircleNotch
} from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function ChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [stats, setStats] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const response = await chatAPI.getSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await statsAPI.get();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const response = await chatAPI.getMessages(sessionId);
      setMessages(response.data);
      setCurrentSession(sessionId);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setMessages([]);
    setInput('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatAPI.send(input, currentSession);
      const { session_id, message, sources } = response.data;

      if (!currentSession) {
        setCurrentSession(session_id);
        loadSessions();
      }

      setMessages((prev) => [...prev, { ...message, sources }]);
    } catch (error) {
      toast.error('Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession === sessionId) {
        startNewChat();
      }
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const getDocTypeBadgeClass = (docType) => {
    const classes = {
      sop: 'badge-sop',
      manual: 'badge-manual',
      compliance: 'badge-compliance',
      other: 'badge-other',
    };
    return classes[docType] || classes.other;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]" data-testid="chat-page">
      {/* Sessions Sidebar */}
      <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <Button
            onClick={startNewChat}
            data-testid="new-chat-btn"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-mono font-semibold rounded-sm"
          >
            <Plus size={18} className="mr-2" />
            NEW QUERY
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-4 border-b border-zinc-800 space-y-2">
            <p className="text-xs font-mono text-zinc-500 uppercase">System Stats</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/50 p-2 rounded-sm">
                <p className="text-lg font-mono text-amber-500">{stats.total_documents}</p>
                <p className="text-xs text-zinc-500">Documents</p>
              </div>
              <div className="bg-zinc-800/50 p-2 rounded-sm">
                <p className="text-lg font-mono text-emerald-500">{stats.my_sessions}</p>
                <p className="text-xs text-zinc-500">Sessions</p>
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <CircleNotch className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <ChatCircleDots size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-mono">No sessions yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadMessages(session.id)}
                  data-testid={`session-${session.id}`}
                  className={`p-3 rounded-sm cursor-pointer group transition-colors ${
                    currentSession === session.id
                      ? 'bg-amber-500/10 border-l-2 border-amber-500'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-mono">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-zinc-500" />
                        <p className="text-xs text-zinc-500">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-sm transition-opacity"
                    >
                      <Trash size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-950">
        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-20">
                <Robot size={64} className="mx-auto mb-4 text-amber-500/50" />
                <h2 className="text-2xl font-mono text-white mb-2">RAGineer QA System</h2>
                <p className="text-zinc-500 max-w-md mx-auto">
                  Ask questions about your engineering documentation, SOPs, manuals, and compliance documents.
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {[
                    'What are the safety procedures for...',
                    'Explain the maintenance steps for...',
                    'What does the SOP say about...',
                    'Find compliance requirements for...',
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="p-3 text-left text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-sm hover:border-amber-500/50 transition-colors font-mono"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 animate-in ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-sm bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Robot size={20} className="text-amber-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl p-4 rounded-sm ${
                      msg.role === 'user'
                        ? 'message-user'
                        : 'message-assistant'
                    }`}
                  >
                    <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-700/50">
                        <p className="text-xs font-mono text-zinc-500 uppercase mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={`${getDocTypeBadgeClass(source.doc_type)} border-0 font-mono text-xs`}
                            >
                              <FileText size={12} className="mr-1" />
                              {source.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-zinc-600 mt-2 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-sm bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-zinc-400" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-4 animate-in">
                <div className="w-10 h-10 rounded-sm bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Robot size={20} className="text-amber-500" />
                </div>
                <div className="message-assistant p-4 rounded-sm">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your engineering documentation..."
                data-testid="chat-input"
                disabled={loading}
                className="flex-1 bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 focus:border-amber-500"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                data-testid="send-btn"
                className="bg-amber-500 hover:bg-amber-600 text-black font-mono font-semibold rounded-sm px-6 glow-amber"
              >
                {loading ? (
                  <CircleNotch className="w-5 h-5 animate-spin" />
                ) : (
                  <PaperPlaneTilt size={20} weight="fill" />
                )}
              </Button>
            </div>
            <p className="text-xs text-zinc-600 mt-2 font-mono text-center">
              {user?.role === 'technician' && 'Access limited to SOP documents'}
              {user?.role === 'viewer' && 'Access limited to SOPs and manuals'}
              {(user?.role === 'admin' || user?.role === 'engineer') && 'Full document access'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

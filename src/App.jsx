import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  FileText, 
  Send, 
  Trash2, 
  Plus, 
  Search, 
  RotateCcw, 
  AlertCircle, 
  Sparkles, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Key,
  Info,
  Clock,
  Terminal,
  CloudSun,
  Calculator
} from 'lucide-react';

export default function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState(true);

  // Active Picker State
  const [activePicker, setActivePicker] = useState(null);

  // Sidebar Data State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);

  // Sidebar Filtering/Search state
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'calendar', 'tasks', 'notes'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form expansion states
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Manual Creation Form states
  const [newEvent, setNewEvent] = useState({ title: '', start_time: '', end_time: '', description: '' });
  const [newTask, setNewTask] = useState({ title: '', due_date: '' });
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  // Chat/AI State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am **Aether**, your personal AI assistant. I have direct integration with your calendar, task list, and notes via Model Context Protocol (MCP) tools.\n\nI can also look up current weather and run complex math equations! Try asking me:\n- *\"Add a group study session tomorrow at 3pm\"*\n- *\"What tasks do I have left for today?\"*\n- *\"Save a note about ideas for weekend dinner - grilled fish and greens\"*\n- *\"What is the weather in Paris?\"*",
      tools: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // API Key config
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);

  const messagesEndRef = useRef(null);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load In-Memory State from Backend on Mount
  useEffect(() => {
    fetchState();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Save API Key to localStorage
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_key', apiKey);
    setShowKeyInput(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_key');
    setApiKey('');
    setShowKeyInput(true);
  };

  // State Fetching from Express Server
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.calendarEvents || []);
        setTasks(data.tasks || []);
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to fetch backend state:', err);
    }
  };

  const handleResetState = async () => {
    if (window.confirm('Are you sure you want to reset all your data back to default demo items?')) {
      try {
        const res = await fetch('/api/state/reset', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setCalendarEvents(data.state.calendarEvents);
          setTasks(data.state.tasks);
          setNotes(data.state.notes);
          alert('Database reset successful!');
        }
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  // ==========================================================================
  // CHAT SENDING LOGIC (AI INTERACTIVE LOOP)
  // ==========================================================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const userMsg = { role: 'user', content: userMessageText };
    setMessages(prev => [...prev, userMsg]);

    // Construct history in the Anthropic format: role 'user' and 'assistant' only
    // Map our messages state to backend expectation
    const apiHistory = messages.map(m => {
      // If it's a model message, we should keep it simple
      if (m.role === 'assistant') {
        return {
          role: 'assistant',
          content: [{ type: 'text', text: m.content }]
        };
      }
      return {
        role: 'user',
        content: m.content
      };
    });
    apiHistory.push({ role: 'user', content: userMessageText });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: apiHistory,
          apiKey: apiKey
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error occurred.');
      }

      const resData = await response.json();
      
      // Update chat state with response text and tools
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resData.message,
        tools: resData.executedTools || []
      }]);

      // Sync backend state immediately (calendar, tasks, notes modified by Claude!)
      if (resData.state) {
        setCalendarEvents(resData.state.calendarEvents);
        setTasks(resData.state.tasks);
        setNotes(resData.state.notes);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error processing message:**\n\n*Please ensure your Gemini API Key is correct and that the Express server is running.*`,
        tools: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action Buttons
  const handleQuickPrompt = (promptText) => {
    setInputValue(promptText);
  };

  // ==========================================================================
  // DASHBOARD MANUAL INTERACTIONS (REST API CALLS)
  // ==========================================================================

  // Tasks manual endpoints
  const handleToggleTask = async (task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
      }
    } catch (err) {
      console.error('Task check error:', err);
    }
  };

  const handleManualCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        setNewTask({ title: '', due_date: '' });
        setShowTaskForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualDeleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar manual endpoints
  const handleManualCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time) return;

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.state.calendarEvents);
        setNewEvent({ title: '', start_time: '', end_time: '', description: '' });
        setShowEventForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualDeleteEvent = async (id) => {
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.state.calendarEvents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Notes manual endpoints
  const handleManualCreateNote = async (e) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.state.notes);
        setNewNote({ title: '', content: '' });
        setShowNoteForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualDeleteNote = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.state.notes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter notes safely on client side
  const filteredNotes = notes.filter(note => 
    (note.title || '').toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
    (note.content || '').toLowerCase().includes(noteSearchQuery.toLowerCase())
  );

  // Formatter for calendar timestamps
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Formatter for display text in custom date pickers
  const formatDisplayDateTime = (isoString, includeTime) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    if (includeTime) {
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // ==========================================================================
  // CUSTOM MARKDOWN RENDER COMPONENT
  // ==========================================================================
  const MarkdownRenderer = ({ text }) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 break-words">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-sm font-bold mt-2 mb-0.5 text-slate-800 dark:text-slate-100 uppercase tracking-wider font-sans">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={idx} className="text-md font-bold mt-3 mb-1 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-0.5">
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={idx} className="text-lg font-bold mt-4 mb-1 text-slate-900 dark:text-white">
                {line.replace('# ', '')}
              </h2>
            );
          }
          
          // Bullets
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start pl-2 py-0.5">
                <span className="text-brand-500 mr-2 font-bold">•</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {renderInlineMarkup(line.substring(2))}
                </span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start pl-2 py-0.5">
                <span className="text-brand-500 mr-2 font-semibold text-xs font-mono mt-0.5">{numMatch[1]}.</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {renderInlineMarkup(numMatch[2])}
                </span>
              </div>
            );
          }
          
          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <div key={idx} className="border-l-3 border-brand-500 bg-slate-50 dark:bg-brand-900/30 px-3 py-1.5 my-2 rounded-r text-sm italic text-slate-600 dark:text-slate-300">
                {renderInlineMarkup(line.substring(2))}
              </div>
            );
          }

          // Empty spacing
          if (line.trim() === '') {
            return <div key={idx} className="h-1.5" />;
          }

          // Regular paragraph
          return (
            <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans font-light">
              {renderInlineMarkup(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineMarkup = (text) => {
    // Splits text by bold (**text**) and inline code (`code`)
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    const tokens = text.split(regex);
    
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={i} className="italic text-slate-800 dark:text-slate-200">{token.slice(1, -1)}</em>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={i} className="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded text-xs font-mono font-medium">
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  // ==========================================================================
  // EXPANDABLE TOOL execution BADGE COMPONENT
  // ==========================================================================
  const ToolBadge = ({ tool }) => {
    const [expanded, setExpanded] = useState(false);
    
    // Choose beautiful color maps and icons for each tool type
    const getToolStyles = (name) => {
      switch (name) {
        case 'add_calendar_event':
        case 'view_calendar_events':
        case 'delete_calendar_event':
          return {
            bg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400',
            label: 'Calendar Tool',
            icon: <CalendarIcon className="w-3.5 h-3.5 mr-1" />
          };
        case 'create_task':
        case 'list_tasks':
        case 'complete_task':
        case 'delete_task':
          return {
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
            label: 'Task/Todo Tool',
            icon: <CheckSquare className="w-3.5 h-3.5 mr-1" />
          };
        case 'save_note':
        case 'search_notes':
          return {
            bg: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
            label: 'Notes Tool',
            icon: <FileText className="w-3.5 h-3.5 mr-1" />
          };
        case 'get_weather':
          return {
            bg: 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/30 text-sky-600 dark:text-sky-400',
            label: 'Weather Tool',
            icon: <CloudSun className="w-3.5 h-3.5 mr-1" />
          };
        case 'evaluate_expression':
          return {
            bg: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400',
            label: 'Calculator Tool',
            icon: <Calculator className="w-3.5 h-3.5 mr-1" />
          };
        default:
          return {
            bg: 'bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/30 text-slate-600 dark:text-slate-400',
            label: 'MCP Tool',
            icon: <Terminal className="w-3.5 h-3.5 mr-1" />
          };
      }
    };

    const style = getToolStyles(tool.name);

    return (
      <div className="mt-2 text-xs border rounded-lg transition-all overflow-hidden bg-slate-50/50 dark:bg-slate-800/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left font-medium ${style.bg} hover:opacity-90 transition-opacity`}
        >
          <div className="flex items-center">
            {style.icon}
            <span>{style.label} called:</span>
            <code className="ml-1.5 px-1 py-0.5 bg-black/5 dark:bg-white/5 rounded font-mono text-[10px] font-bold">
              {tool.name}
            </code>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
              {tool.success ? 'Success' : 'Error'}
            </span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        </button>

        {expanded && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/80 dark:bg-slate-900/60 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-slate-400 font-bold select-none">&gt; INPUT PARAMETERS:</span>
              <pre className="mt-1 p-2 bg-slate-100 dark:bg-black/30 rounded overflow-x-auto text-brand-600 dark:text-brand-400 font-mono">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-slate-400 font-bold select-none">&gt; RETURN RESULT:</span>
              <pre className="mt-1 p-2 bg-slate-100 dark:bg-black/30 rounded overflow-x-auto text-slate-800 dark:text-slate-200 font-mono">
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      
      {/* ======================================================================
          TOP HEADER
          ====================================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 glass-effect py-3 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-md md:text-lg font-bold font-sans tracking-tight bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
                AETHER
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:block">
                AI Assistant & MCP Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            title="Configure Gemini API Key"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border ${
              apiKey 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {apiKey ? 'Gemini Key Saved' : 'Enter Gemini Key'}
            </span>
          </button>

          <button
            onClick={handleResetState}
            title="Reset Mock Database"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-all flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-all flex items-center justify-center"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* ======================================================================
          API KEY SETTINGS POPDOWN banner
          ====================================================================== */}
      {showKeyInput && (
        <div className="bg-brand-50 border-b border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/20 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 max-w-lg">
            <Info className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <div className="text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-white">Gemini credentials required</span>.
              Enter your standard Google AI Studio Gemini API Key below. This key is saved locally in your browser's storage and never exposed. Alternatively, set the key on the server environment.
            </div>
          </div>
          <form onSubmit={handleSaveApiKey} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full sm:w-64 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-brand-500 outline-none"
            />
            {apiKey && (
              <button
                type="button"
                onClick={handleClearApiKey}
                className="px-2.5 py-1.5 text-[11px] text-red-500 font-medium hover:underline flex-shrink-0"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors flex-shrink-0 shadow-md shadow-brand-500/10"
            >
              Save Key
            </button>
          </form>
        </div>
      )}

      {/* ======================================================================
          MAIN INTERFACE BODY
          ====================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ======================================================================
            SIDEBAR (LEFT PANEL): Dashboard widgets for Calendar, Tasks, Notes
            ====================================================================== */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-80 md:w-85 border-r border-slate-200/80 dark:border-slate-800 
          bg-white/95 dark:bg-slate-900/95 md:bg-white md:dark:bg-slate-900 p-4 flex flex-col justify-between 
          transition-transform duration-300 transform md:translate-x-0 md:static
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-brand-500" />
                Live State Stores
              </span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Sidebar Tab Selector */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-xs font-medium">
              {['all', 'calendar', 'tasks', 'notes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-1.5 rounded-lg text-center capitalize transition-all ${
                    activeTab === tab 
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-500 dark:text-white font-bold' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Scrollable Widget Stores container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              
              {/* --------------------------------------------------------------
                  1. CALENDAR WIDGET
                  -------------------------------------------------------------- */}
              {(activeTab === 'all' || activeTab === 'calendar') && (
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wider">Calendar ({calendarEvents.length})</span>
                    </div>
                    <button
                      onClick={() => setShowEventForm(!showEventForm)}
                      className="p-1 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                      title="Schedule Event"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showEventForm && (
                    <form onSubmit={handleManualCreateEvent} className="bg-white dark:bg-slate-900 border border-amber-500/20 p-2.5 rounded-xl space-y-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Event Title..."
                        value={newEvent.title}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Start Time</label>
                          <input
                            type="text"
                            readOnly
                            required
                            placeholder="Select start..."
                            value={formatDisplayDateTime(newEvent.start_time, true)}
                            onClick={() => {
                              const initial = newEvent.start_time || new Date().toISOString().substring(0, 16);
                              setActivePicker({ target: 'event_start', initialValue: initial, includeTime: true });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none text-[10px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">End Time</label>
                          <input
                            type="text"
                            readOnly
                            required
                            placeholder="Select end..."
                            value={formatDisplayDateTime(newEvent.end_time, true)}
                            onClick={() => {
                              const initial = newEvent.end_time || new Date(Date.now() + 3600000).toISOString().substring(0, 16);
                              setActivePicker({ target: 'event_end', initialValue: initial, includeTime: true });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none text-[10px] font-medium"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Location / Description (optional)..."
                        value={newEvent.description}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                      <div className="flex justify-end gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowEventForm(false)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Calendar Event Cards */}
                  <div className="space-y-2">
                    {calendarEvents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-2">No scheduled events</p>
                    ) : (
                      calendarEvents.map((evt) => (
                        <div 
                          key={evt.id} 
                          className="group relative p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-800 hover:shadow-md hover:border-amber-500/20 transition-all text-xs"
                        >
                          <div className="pr-5">
                            <h4 className="font-bold text-slate-800 dark:text-white truncate">{evt.title}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{formatDateTime(evt.start_time)}</span>
                            </div>
                            {evt.description && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                                {evt.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleManualDeleteEvent(evt.id)}
                            className="absolute top-2.5 right-2 p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  2. TODO/TASKS WIDGET
                  -------------------------------------------------------------- */}
              {(activeTab === 'all' || activeTab === 'tasks') && (
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wider">Tasks ({tasks.length})</span>
                    </div>
                    <button
                      onClick={() => setShowTaskForm(!showTaskForm)}
                      className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      title="Add Task"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showTaskForm && (
                    <form onSubmit={handleManualCreateTask} className="bg-white dark:bg-slate-900 border border-emerald-500/20 p-2.5 rounded-xl space-y-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Task details..."
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <div>
                        <label className="text-slate-400 block mb-0.5 text-[10px]">Due Date</label>
                        <input
                          type="text"
                          readOnly
                          placeholder="Choose due date..."
                          value={formatDisplayDateTime(newTask.due_date, false)}
                          onClick={() => {
                            const initial = newTask.due_date || new Date().toISOString().substring(0, 10);
                            setActivePicker({ target: 'task_due', initialValue: initial, includeTime: false });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none text-[10px] font-medium"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(false)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-1.5">
                    {tasks.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-2">No tasks listed</p>
                    ) : (
                      tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="group relative flex items-center justify-between p-2 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-800 hover:border-emerald-500/20 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2.5 pr-6 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleTask(task)}
                              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className={`font-medium block truncate text-slate-800 dark:text-slate-200 ${
                                task.completed ? 'line-through text-slate-400 dark:text-slate-500 font-light' : ''
                              }`}>
                                {task.title}
                              </span>
                              {task.due_date && (
                                <span className="text-[9px] text-slate-400 block font-light">
                                  Due: {task.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleManualDeleteTask(task.id)}
                            className="absolute top-2 right-2 p-0.5 text-slate-300 hover:text-red-500 rounded hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  3. NOTES WIDGET
                  -------------------------------------------------------------- */}
              {(activeTab === 'all' || activeTab === 'notes') && (
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wider">Notes ({filteredNotes.length})</span>
                    </div>
                    <button
                      onClick={() => setShowNoteForm(!showNoteForm)}
                      className="p-1 rounded-lg text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                      title="Write Note"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Notes Search bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      value={noteSearchQuery}
                      onChange={(e) => setNoteSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {showNoteForm && (
                    <form onSubmit={handleManualCreateNote} className="bg-white dark:bg-slate-900 border border-indigo-500/20 p-2.5 rounded-xl space-y-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Note Title..."
                        value={newNote.title}
                        onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <textarea
                        required
                        rows={3}
                        placeholder="Type note details here..."
                        value={newNote.content}
                        onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                      />
                      <div className="flex justify-end gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowNoteForm(false)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Notes Card list */}
                  <div className="space-y-2">
                    {filteredNotes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-2">No notes found</p>
                    ) : (
                      filteredNotes.map((note) => (
                        <div 
                          key={note.id} 
                          className="group relative p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-800 hover:border-indigo-500/20 transition-all text-xs"
                        >
                          <div className="pr-6 space-y-1">
                            <h4 className="font-bold text-slate-800 dark:text-white truncate">{note.title}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {note.content}
                            </p>
                            {note.created_at && (
                              <span className="text-[8px] text-slate-400 block font-light select-none pt-0.5">
                                {new Date(note.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleManualDeleteNote(note.id)}
                            className="absolute top-2.5 right-2.5 p-0.5 text-slate-300 hover:text-red-500 rounded hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Sidebar Status Footer */}
          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>STORE STATUS: OK</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
          </div>
        </aside>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs md:hidden"
          />
        )}

        {/* ======================================================================
            CHAT WORKSPACE (RIGHT COLUMN)
            ====================================================================== */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100/50 dark:bg-slate-900/40">
          
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:p-6 space-y-6">
            
            {/* Suggestions/Welcome box when empty */}
            {messages.length <= 1 && !isLoading && (
              <div className="max-w-2xl mx-auto py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-800 dark:text-white">Conversational AI Assistant</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Ask Aether to update schedules, set tasks, find notes, retrieve details, compute maths, or fetch weather report. 
                </p>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto pt-3">
                  {[
                    { label: '📅 Add meeting tomorrow 3pm', prompt: 'Add a meeting tomorrow at 3pm to review designs' },
                    { label: '🌤️ Hyderabad weather lookup', prompt: "What's the weather in Hyderabad?" },
                    { label: '📝 Save coding guidelines note', prompt: 'Save a note: react goals - single-file JSX, styled with Tailwind' },
                    { label: '🧮 Compute: (1240 * 15) / 2', prompt: 'What is (1240 * 15) / 2?' }
                  ].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(sug.prompt)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:border-brand-500/20 text-left text-xs text-slate-700 dark:text-slate-300 transition-all font-light"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render conversation messages */}
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, index) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-3.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {/* Bot Avatar Icon */}
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/10 flex items-center justify-center text-white text-xs font-bold font-mono flex-shrink-0">
                        AE
                      </div>
                    )}

                    <div className="max-w-[85%] md:max-w-[80%] flex flex-col space-y-1.5">
                      
                      {/* Message Bubble Card */}
                      <div className={`p-4 rounded-2xl shadow-sm border ${
                        isAssistant 
                          ? 'bg-white dark:bg-slate-800 border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200' 
                          : 'bg-brand-500 border-brand-500 text-white font-medium shadow-brand-500/10'
                      }`}>
                        {isAssistant ? (
                          <MarkdownRenderer text={msg.content} />
                        ) : (
                          <p className="text-sm font-sans font-light whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Display inline tool executions underneath assistant replies */}
                      {isAssistant && msg.tools && msg.tools.length > 0 && (
                        <div className="space-y-1 px-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-1 select-none">
                            <Terminal className="w-3.5 h-3.5 text-slate-500" />
                            MCP tools called ({msg.tools.length}):
                          </p>
                          {msg.tools.map((tool, tIdx) => (
                            <ToolBadge key={tool.id || tIdx} tool={tool} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Loader Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold font-mono flex-shrink-0 animate-pulse">
                    AE
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800 shadow-sm flex items-center gap-1 py-3 px-4">
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
            
            <div className="max-w-3xl mx-auto px-1">
              {/* Floating Inline Prompt Card (Separate from screen bottom, kept near conversational context) */}
              <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/60 mt-6">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    placeholder="Ask Aether to schedule meetings, list tasks, check weather..."
                    className="w-full pl-4 pr-12 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-brand-500 outline-none disabled:opacity-75 transition-all text-slate-800 dark:text-slate-100 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-white transition-colors shadow-md shadow-brand-500/10 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 font-mono mt-1.5 select-none">
                  <span>Model: Gemini 1.5 Flash</span>
                  <span>Inline MCP Protocol</span>
                </div>
              </div>
            </div>

          </div>



        </main>
      </div>

      {activePicker && (
        <DateTimePickerModal
          initialValue={activePicker.initialValue}
          includeTime={activePicker.includeTime}
          onCancel={() => setActivePicker(null)}
          onSelect={(selectedValue) => {
            if (activePicker.target === 'event_start') {
              setNewEvent(prev => ({ ...prev, start_time: selectedValue }));
            } else if (activePicker.target === 'event_end') {
              setNewEvent(prev => ({ ...prev, end_time: selectedValue }));
            } else if (activePicker.target === 'task_due') {
              setNewTask(prev => ({ ...prev, due_date: selectedValue }));
            }
            setActivePicker(null);
          }}
        />
      )}

    </div>
  );
}

// ==========================================================================
// CUSTOM PREMIUM DATE & TIME PICKER MODAL
// ==========================================================================
function DateTimePickerModal({ initialValue, includeTime, onCancel, onSelect }) {
  const initialDate = initialValue ? new Date(initialValue) : new Date();
  const parsedDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewDate, setViewDate] = useState(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(parsedDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(parsedDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(parsedDate.getFullYear());

  const initialHour24 = parsedDate.getHours();
  const initialHour12 = initialHour24 % 12 === 0 ? 12 : initialHour24 % 12;
  const initialMinute = parsedDate.getMinutes();
  const initialAmPm = initialHour24 >= 12 ? 'PM' : 'AM';

  const [hour, setHour] = useState(initialHour12);
  const [minute, setMinute] = useState(Math.round(initialMinute / 5) * 5 % 60);
  const [ampm, setAmpm] = useState(initialAmPm);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push(i);
  }

  const handleSave = () => {
    let finalHour = hour;
    if (includeTime) {
      if (ampm === 'PM' && hour < 12) finalHour = hour + 12;
      if (ampm === 'AM' && hour === 12) finalHour = 0;
    } else {
      finalHour = 12;
    }
    
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay, finalHour, includeTime ? minute : 0, 0);
    
    if (includeTime) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const hh = String(selectedDate.getHours()).padStart(2, '0');
      const min = String(selectedDate.getMinutes()).padStart(2, '0');
      onSelect(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } else {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      onSelect(`${yyyy}-${mm}-${dd}`);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transition-all duration-300">
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <span className="font-bold text-sm text-slate-800 dark:text-white font-sans">
            {includeTime ? 'Select Date & Time' : 'Select Due Date'}
          </span>
          <button 
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-800 dark:text-white">
            {monthNames[month]} {year}
          </span>
          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-4 text-center">
          {weekdayNames.map(wd => (
            <span key={wd} className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 select-none py-1">
              {wd}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
          {cells.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} />;
            }
            const isSelected = selectedDay === dayNum && selectedMonth === month && selectedYear === year;
            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                onClick={() => {
                  setSelectedDay(dayNum);
                  setSelectedMonth(month);
                  setSelectedYear(year);
                }}
                className={`py-2 rounded-xl text-xs font-semibold font-mono transition-all flex items-center justify-center ${
                  isSelected 
                    ? 'bg-brand-500 text-white font-bold shadow-lg shadow-brand-500/20' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {includeTime && (
          <div className="mx-4 p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-around gap-1 mb-4">
            
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 mb-1 select-none">Hour</span>
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold font-mono text-slate-700 dark:text-slate-300 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
            </div>

            <span className="font-bold text-slate-400 text-sm mt-4 select-none">:</span>

            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 mb-1 select-none">Minute</span>
              <select
                value={minute}
                onChange={(e) => setMinute(parseInt(e.target.value))}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold font-mono text-slate-700 dark:text-slate-300 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 mb-1 select-none">Period</span>
              <div className="p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center">
                {['AM', 'PM'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmpm(p)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      ampm === p 
                        ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-500 dark:text-white' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4.5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20"
          >
            Confirm
          </button>
        </div>

      </div>
    </div>
  );
}

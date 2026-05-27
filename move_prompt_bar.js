import fs from 'fs';

const filePath = './src/App.jsx';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Define the floating prompt bar JSX markup
  const floatingPromptJSX = `
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
                  <span>Model: Claude 3.5 Sonnet</span>
                  <span>Inline MCP Protocol</span>
                </div>
              </div>
  `;

  // 2. Locate messagesEndRef in the JSX to insert floating prompt right before/after it
  const messagesContainerEnd = `<div ref={messagesEndRef} />
            </div>`;

  const messagesReplacement = `<div ref={messagesEndRef} />
            </div>
            
            <div className="max-w-3xl mx-auto px-1">
              ${floatingPromptJSX.trim()}
            </div>`;

  if (content.includes(messagesContainerEnd)) {
    content = content.replace(messagesContainerEnd, messagesReplacement);
    console.log('- Inserted floating prompt inside messages viewport');
  } else {
    console.error('Could not find messagesContainerEnd pattern');
  }

  // 3. Locate and completely remove the bottom sticky footer bar
  const footerPattern = `          {/* ======================================================================
              INPUT BOTTOM TOOLBAR
              ====================================================================== */}
          <footer className="border-t border-slate-200/80 dark:border-slate-800 glass-effect p-4 md:px-6">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder="Ask Aether to schedule meetings, list tasks, check weather..."
                className="w-full pl-4 pr-12 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-brand-500 outline-none disabled:opacity-75 transition-all text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-white transition-colors shadow-md shadow-brand-500/10 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="max-w-3xl mx-auto mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>Model: Claude 3.5 Sonnet</span>
              <span>Inline MCP Protocol</span>
            </div>
          </footer>`;

  if (content.includes(footerPattern)) {
    content = content.replace(footerPattern, '');
    console.log('- Successfully removed bottom footer bar');
  } else {
    // Check if standard color replacement has already run and modified footer border
    const footerPatternModified = `          {/* ======================================================================
              INPUT BOTTOM TOOLBAR
              ====================================================================== */}
          <footer className="border-t border-slate-200/80 dark:border-slate-800 glass-effect p-4 md:px-6">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder="Ask Aether to schedule meetings, list tasks, check weather..."
                className="w-full pl-4 pr-12 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-brand-500 outline-none disabled:opacity-75 transition-all text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-white transition-colors shadow-md shadow-brand-500/10 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="max-w-3xl mx-auto mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>Model: Claude 3.5 Sonnet</span>
              <span>Inline MCP Protocol</span>
            </div>
          </footer>`;

    content = content.replace(footerPatternModified, '');
    console.log('- Removed bottom footer bar (using modified pattern)');
  }

  fs.writeFileSync(filePath, content, 'utf8');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

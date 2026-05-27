import fs from 'fs';

const filePath = './src/App.jsx';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace Event Start/End DateTime inputs with clean click-to-open readOnly text inputs
  const eventTargetPattern = `                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Start Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={newEvent.start_time}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                            onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                            className="w-full px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">End Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={newEvent.end_time}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                            onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                            className="w-full px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </div>
                      </div>`;

  const eventReplacement = `                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
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
                      </div>`;

  if (content.includes(eventTargetPattern)) {
    content = content.replace(eventTargetPattern, eventReplacement);
    console.log('- Successfully replaced Event inputs');
  } else {
    console.log('- Event input replacement skipped (already replaced)');
  }

  // 2. Replace Task Due Date input
  const taskTargetPattern = `                      <div>
                        <label className="text-slate-400 block mb-0.5 text-[10px]">Due Date</label>
                        <input
                          type="date"
                          value={newTask.due_date}
                          onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                          onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                          className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>`;

  const taskReplacement = `                      <div>
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
                      </div>`;

  if (content.includes(taskTargetPattern)) {
    content = content.replace(taskTargetPattern, taskReplacement);
    console.log('- Successfully replaced Task input');
  } else {
    console.log('- Task input replacement skipped (already replaced)');
  }

  // 3. Inject DateTimePickerModal state renderer & standalone component declaration
  const bottomTarget = `    </div>
  );
}`;

  const bottomReplacement = `      {activePicker && (
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
      onSelect(\`\${yyyy}-\${mm}-\${dd}T\${hh}:\${min}\`);
    } else {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      onSelect(\`\${yyyy}-\${mm}-\${dd}\`);
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
              return <div key={\`empty-\${idx}\`} />;
            }
            const isSelected = selectedDay === dayNum && selectedMonth === month && selectedYear === year;
            return (
              <button
                key={\`day-\${dayNum}\`}
                type="button"
                onClick={() => {
                  setSelectedDay(dayNum);
                  setSelectedMonth(month);
                  setSelectedYear(year);
                }}
                className={\`py-2 rounded-xl text-xs font-semibold font-mono transition-all flex items-center justify-center \${
                  isSelected 
                    ? 'bg-brand-500 text-white font-bold shadow-lg shadow-brand-500/20' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }\`}
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
                    className={\`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all \${
                      ampm === p 
                        ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-500 dark:text-white' 
                        : 'text-slate-400 hover:text-slate-500'
                    }\`}
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
}`;

  const lastIndex = content.lastIndexOf(bottomTarget);
  if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + bottomReplacement + content.substring(lastIndex + bottomTarget.length);
    console.log('- Successfully injected custom modal and state renderer');
  } else {
    console.error('Could not find bottom target pattern');
  }

  fs.writeFileSync(filePath, content, 'utf8');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

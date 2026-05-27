import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============================================================================
// IN-MEMORY DATA STORE (Initial Mock Data)
// ============================================================================
let calendarEvents = [
  { 
    id: 'c1', 
    title: 'Project Demo with Sarah', 
    start_time: '2026-05-28T14:00', 
    end_time: '2026-05-28T15:00', 
    description: 'Walk through the personal assistant interface and show tool execution badges.' 
  },
  { 
    id: 'c2', 
    title: 'Doctor Checkup', 
    start_time: '2026-05-29T10:00', 
    end_time: '2026-05-29T11:00', 
    description: 'Routine wellness check.' 
  }
];

let tasks = [
  { id: 't1', title: 'Complete personal assistant React UI', completed: false, due_date: '2026-05-28' },
  { id: 't2', title: 'Integrate Open-Meteo weather API', completed: true, due_date: '2026-05-27' },
  { id: 't3', title: 'Prepare project presentation slides', completed: false, due_date: '2026-05-30' }
];

let notes = [
  { 
    id: 'n1', 
    title: 'Vite Proxy Setup', 
    content: 'Configured Vite proxy in vite.config.js to seamlessly forward all /api/* requests to localhost:3001. Avoids CORS issues.', 
    created_at: '2026-05-27T17:00:00.000Z' 
  },
  { 
    id: 'n2', 
    title: 'Groceries List', 
    content: 'Need to buy organic milk, fresh spinach, sourdough bread, and coffee beans.', 
    created_at: '2026-05-27T18:30:00.000Z' 
  }
];

// Helper to get fresh state
const getCurrentState = () => ({
  calendarEvents,
  tasks,
  notes
});

// ============================================================================
// TOOL HANDLERS
// ============================================================================

// 1. Calendar Tool Handlers
function addCalendarEvent({ title, start_time, end_time, description = '' }) {
  const newEvent = {
    id: 'c_' + Math.random().toString(36).substr(2, 9),
    title,
    start_time,
    end_time,
    description
  };
  calendarEvents.push(newEvent);
  return { success: true, message: 'Event added successfully.', event: newEvent };
}

function viewCalendarEvents({ start_date, end_date }) {
  let filtered = [...calendarEvents];
  if (start_date) {
    filtered = filtered.filter(e => e.start_time >= start_date);
  }
  if (end_date) {
    filtered = filtered.filter(e => e.start_time <= end_date + 'T23:59:59');
  }
  filtered.sort((a, b) => a.start_time.localeCompare(b.start_time));
  return filtered;
}

function deleteCalendarEvent({ id }) {
  const index = calendarEvents.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error(`Calendar event with ID ${id} not found.`);
  }
  const deleted = calendarEvents.splice(index, 1)[0];
  return { success: true, message: 'Event deleted successfully.', event: deleted };
}

// 2. Task Tool Handlers
function createTask({ title, due_date = '' }) {
  const newTask = {
    id: 't_' + Math.random().toString(36).substr(2, 9),
    title,
    completed: false,
    due_date
  };
  tasks.push(newTask);
  return { success: true, message: 'Task created successfully.', task: newTask };
}

function listTasks() {
  return tasks;
}

// Complete a task
function completeTask({ id }) {
  const task = tasks.find(t => t.id === id);
  if (!task) {
    throw new Error(`Task with ID ${id} not found.`);
  }
  task.completed = true;
  return { success: true, message: 'Task marked as completed.', task };
}

function deleteTask({ id }) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error(`Task with ID ${id} not found.`);
  }
  const deleted = tasks.splice(index, 1)[0];
  return { success: true, message: 'Task deleted successfully.', task: deleted };
}

// 3. Notes Tool Handlers
function saveNote({ title, content }) {
  const newNote = {
    id: 'n_' + Math.random().toString(36).substr(2, 9),
    title,
    content,
    created_at: new Date().toISOString()
  };
  notes.push(newNote);
  return { success: true, message: 'Note saved successfully.', note: newNote };
}

function searchNotes({ query }) {
  if (!query) {
    return notes;
  }
  const lowQuery = query.toLowerCase();
  return notes.filter(n => 
    (n.title || '').toLowerCase().includes(lowQuery) || 
    (n.content || '').toLowerCase().includes(lowQuery)
  );
}

// 4. Weather Tool Handler (Uses free Open-Meteo API)
async function getWeather({ city }) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error('Geocoding service unavailable');
    
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`Could not find location coordinates for city: "${city}"`);
    }

    const { latitude, longitude, name, country, admin1 } = geoData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error('Weather API service unavailable');
    
    const weatherData = await weatherRes.json();
    if (!weatherData.current_weather) {
      throw new Error(`Could not retrieve weather data for: "${name}"`);
    }

    const { temperature, windspeed, weathercode } = weatherData.current_weather;
    
    const codeMap = {
      0: 'Clear sky ☀️',
      1: 'Mainly clear 🌤️', 2: 'Partly cloudy ⛅', 3: 'Overcast ☁️',
      45: 'Fog 🌫️', 48: 'Depositing rime fog 🌫️',
      51: 'Light drizzle 🌧️', 53: 'Moderate drizzle 🌧️', 55: 'Dense drizzle 🌧️',
      61: 'Slight rain 🌧️', 63: 'Moderate rain 🌧️', 65: 'Heavy rain 🌧️',
      71: 'Slight snow fall ❄️', 73: 'Moderate snow fall ❄️', 75: 'Heavy snow fall ❄️',
      77: 'Snow grains ❄️',
      80: 'Slight rain showers 🌦️', 81: 'Moderate rain showers 🌦️', 82: 'Violent rain showers ⛈️',
      85: 'Slight snow showers 🌨️', 86: 'Heavy snow showers 🌨️',
      95: 'Thunderstorm ⛈️', 96: 'Thunderstorm with slight hail ⛈️', 99: 'Thunderstorm with heavy hail ⛈️'
    };

    const condition = codeMap[weathercode] || 'Unspecified Weather Code';
    const region = admin1 ? `${name}, ${admin1}, ${country}` : `${name}, ${country}`;

    return {
      success: true,
      city: name,
      region,
      latitude,
      longitude,
      temperature: `${temperature}°C`,
      wind_speed: `${windspeed} km/h`,
      condition,
      raw_code: weathercode
    };
  } catch (error) {
    throw new Error(`Weather lookup failed: ${error.message}`);
  }
}

// 5. Calculator Tool Handler
function evaluateExpression({ expression }) {
  if (/^[0-9+\-*/().\s]+$/.test(expression)) {
    try {
      const val = Function(`"use strict"; return (${expression})`)();
      if (typeof val === 'number') {
        return { success: true, expression, result: val };
      }
      throw new Error('Result did not evaluate to a number.');
    } catch (e) {
      throw new Error(`Evaluation error: ${e.message}`);
    }
  } else {
    throw new Error('Forbidden characters in expression. Only basic arithmetic operators, numbers, and parentheses are allowed.');
  }
}

// Map tool calls to functions
async function executeToolByName(name, input) {
  switch (name) {
    case 'add_calendar_event': return addCalendarEvent(input);
    case 'view_calendar_events': return viewCalendarEvents(input);
    case 'delete_calendar_event': return deleteCalendarEvent(input);
    case 'create_task': return createTask(input);
    case 'list_tasks': return listTasks();
    case 'complete_task': return completeTask(input);
    case 'delete_task': return deleteTask(input);
    case 'save_note': return saveNote(input);
    case 'search_notes': return searchNotes(input);
    case 'get_weather': return await getWeather(input);
    case 'evaluate_expression': return evaluateExpression(input);
    default: throw new Error(`Unknown tool name: ${name}`);
  }
}

// ============================================================================
// API ENDPOINTS - REST STATE CONTROL
// ============================================================================
app.get('/api/state', (req, res) => {
  res.json(getCurrentState());
});

app.post('/api/state/reset', (req, res) => {
  calendarEvents = [
    { id: 'c1', title: 'Project Demo with Sarah', start_time: '2026-05-28T14:00', end_time: '2026-05-28T15:00', description: 'Walk through interface.' },
    { id: 'c2', title: 'Doctor Checkup', start_time: '2026-05-29T10:00', end_time: '2026-05-29T11:00', description: 'Routine checkup.' }
  ];
  tasks = [
    { id: 't1', title: 'Complete personal assistant React UI', completed: false, due_date: '2026-05-28' },
    { id: 't2', title: 'Integrate Open-Meteo weather API', completed: true, due_date: '2026-05-27' },
    { id: 't3', title: 'Prepare project presentation slides', completed: false, due_date: '2026-05-30' }
  ];
  notes = [
    { id: 'n1', title: 'Vite Proxy Setup', content: 'Configured Vite proxy in vite.config.js.', created_at: new Date().toISOString() }
  ];
  res.json({ success: true, state: getCurrentState() });
});

app.post('/api/calendar', (req, res) => {
  const result = addCalendarEvent(req.body);
  res.status(201).json({ ...result, state: getCurrentState() });
});

app.delete('/api/calendar/:id', (req, res) => {
  try {
    const result = deleteCalendarEvent({ id: req.params.id });
    res.json({ ...result, state: getCurrentState() });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  const result = createTask(req.body);
  res.status(201).json({ ...result, state: getCurrentState() });
});

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task with ID ${id} not found.` });
  }
  if (completed !== undefined) {
    task.completed = completed;
  }
  res.json({ success: true, task, state: getCurrentState() });
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const result = deleteTask({ id: req.params.id });
    res.json({ ...result, state: getCurrentState() });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/notes', (req, res) => {
  const result = saveNote(req.body);
  res.status(201).json({ ...result, state: getCurrentState() });
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    const index = notes.findIndex(n => n.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    const deleted = notes.splice(index, 1)[0];
    res.json({ success: true, note: deleted, state: getCurrentState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GEMINI MULTI-TURN TOOL EXECUTION CHAT LOOP
// ============================================================================
app.post('/api/chat', async (req, res) => {
  const { messages, apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      error: 'Gemini API Key missing. Please set GEMINI_API_KEY in the .env file or enter it in the top settings bar of the UI.'
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Map simplified chat history from frontend to Google GenAI Content Schema
    // Exclude the initial greeting if it starts the history
    let chatHistory = [...messages];
    while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
      chatHistory.shift();
    }

    if (chatHistory.length === 0) {
      return res.status(400).json({ error: 'No active user message found in history.' });
    }

    const geminiHistory = chatHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Split history to startChat and sendMessage
    const historyToPass = geminiHistory.slice(0, -1);
    const lastMsg = geminiHistory[geminiHistory.length - 1];
    const userPrompt = lastMsg.parts[0].text;

    const systemPrompt = `You are Aether, an elegant, high-capability AI Personal Assistant.
You interact with the user via a sleek modern interface. You are equipped with direct Model Context Protocol (MCP) tools that let you read and modify the user's active context.
The current local time is: ${new Date().toLocaleString()} (user's system time). The current ISO time is: ${new Date().toISOString()}.
Use this current date and time as your relative reference point to resolve relative expressions like "today", "tomorrow", "next Monday", "3pm", etc. Calculate the correct date dynamically based on this reference time.

TOOLS RULES:
1. Calendar events require a 'title', 'start_time', and 'end_time'. If the user asks to schedule an event for a relative day/time (e.g., "tomorrow at 3pm"), calculate the correct ISO timestamp dynamically based on the current reference time and weekday. Default duration for events is 1 hour if not specified.
2. Todo tasks: Always query current list if user asks what they have to do, or complete a task by ID.
3. Notes: You can save and search. Ensure title is short and contents are well-formatted.
4. Weather: Use the get_weather tool. Do not guess weather.
5. Calculator: Use evaluate_expression.

CRITICAL REQUIREMENTS:
- After calling ANY tool, you MUST acknowledge the tool's result in your final reply and confirm the action in a warm, helpful, and friendly tone.
- Explain what you did clearly (e.g., "I've successfully scheduled 'Doctor Checkup' for tomorrow morning at 10:00 AM!").
- Do not mention raw IDs to the user unless they ask, speak in natural terms.
- Use elegant markdown formatting in your responses.`;

    const tools = [{
      functionDeclarations: [
        {
          name: 'add_calendar_event',
          description: 'Adds a new event to the user\'s calendar. All times must be in ISO 8601 format (YYYY-MM-DDTHH:MM).',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'The title of the event' },
              start_time: { type: 'STRING', description: 'Start date and time (e.g. 2026-05-28T14:00)' },
              end_time: { type: 'STRING', description: 'End date and time (e.g. 2026-05-28T15:00)' },
              description: { type: 'STRING', description: 'Optional event details' }
            },
            required: ['title', 'start_time', 'end_time']
          }
        },
        {
          name: 'view_calendar_events',
          description: 'Retrieves calendar events. You can optionally filter by a date range.',
          parameters: {
            type: 'OBJECT',
            properties: {
              start_date: { type: 'STRING', description: 'Filter events starting on or after this date (YYYY-MM-DD)' },
              end_date: { type: 'STRING', description: 'Filter events starting on or before this date (YYYY-MM-DD)' }
            }
          }
        },
        {
          name: 'delete_calendar_event',
          description: 'Deletes a calendar event by its ID.',
          parameters: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', description: 'The ID of the event to delete' }
            },
            required: ['id']
          }
        },
        {
          name: 'create_task',
          description: 'Creates a new task/todo in the user\'s list.',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'The task description' },
              due_date: { type: 'STRING', description: 'Optional due date (YYYY-MM-DD)' }
            },
            required: ['title']
          }
        },
        {
          name: 'list_tasks',
          description: 'Lists all current tasks, completed and uncompleted.',
          parameters: {
            type: 'OBJECT',
            properties: {}
          }
        },
        {
          name: 'complete_task',
          description: 'Marks an existing task as completed.',
          parameters: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', description: 'The ID of the task' }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_task',
          description: 'Deletes a task by ID.',
          parameters: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', description: 'The ID of the task' }
            },
            required: ['id']
          }
        },
        {
          name: 'save_note',
          description: 'Saves a new text note with title and details.',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'The note title' },
              content: { type: 'STRING', description: 'The note details/body' }
            },
            required: ['title', 'content']
          }
        },
        {
          name: 'search_notes',
          description: 'Searches through saved notes. Leave query empty to list all notes.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: { type: 'STRING', description: 'Query search string' }
            }
          }
        },
        {
          name: 'get_weather',
          description: 'Retrieves current weather details (temperature, conditions, wind) for a city using Open-Meteo.',
          parameters: {
            type: 'OBJECT',
            properties: {
              city: { type: 'STRING', description: 'Name of the city (e.g. Hyderabad, Paris)' }
            },
            required: ['city']
          }
        },
        {
          name: 'evaluate_expression',
          description: 'Evaluates basic mathematical expressions safely (e.g. "(50 * 2) / 4").',
          parameters: {
            type: 'OBJECT',
            properties: {
              expression: { type: 'STRING', description: 'Math expression' }
            },
            required: ['expression']
          }
        }
      ]
    }];

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
      tools: tools
    });

    // Start Chat Session
    const chat = model.startChat({
      history: historyToPass
    });

    let response = await chat.sendMessage(userPrompt);
    let functionCalls = response.functionCalls;
    let triggeredTools = [];
    let loopCounter = 0;
    const maxLoops = 8;

    while (functionCalls && functionCalls.length > 0 && loopCounter < maxLoops) {
      loopCounter++;
      const toolResults = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        const id = 't_' + Math.random().toString(36).substr(2, 9);
        
        try {
          const result = await executeToolByName(name, args);
          triggeredTools.push({ id, name, input: args, success: true, result });
          toolResults.push({
            functionResponse: {
              name,
              response: { result }
            }
          });
        } catch (err) {
          triggeredTools.push({ id, name, input: args, success: false, result: err.message });
          toolResults.push({
            functionResponse: {
              name,
              response: { error: err.message }
            }
          });
        }
      }

      // Feed function outputs back to the Gemini Chat session
      response = await chat.sendMessage(toolResults);
      functionCalls = response.functionCalls;
    }

    const finalMessage = response.text || 'Action executed successfully.';

    res.json({
      message: finalMessage,
      history: [],
      executedTools: triggeredTools,
      state: getCurrentState()
    });

  } catch (error) {
    console.error('Gemini Chat error:', error);
    res.status(550).json({ error: error.message || 'An error occurred while communicating with Gemini.' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets from the React 'dist' build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Personal Assistant backend running on http://localhost:${PORT} (Gemini API)`);
});

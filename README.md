# Aether - Personal Assistant with MCP Tools

Aether is a premium, high-performance personal assistant web application designed to handle planning, organization, and calculations. It features active integration with 11 custom inline Model Context Protocol (MCP) tools executing via the Google AI Studio Gemini API.

---

## Live Website

You can access the live application here:

*   **Frontend UI (Vercel)**: [Live Website Link](https://aether-ai-aplha.vercel.app/)
*   **Backend API (Render)**: [Live API Link](https://aether-api.onrender.com)

*Note: Please update these links to match your custom domains if applicable.*

---

## Core Features

*   **Contextual Input Interface**: A floating, inline chat bar that scrolls naturally with the conversation timeline for a modern experience.
*   **Custom Date-Time Selection**: Center-screen overlay picker with a soft backdrop blur, fully integrated with clean human-readable date display formatters.
*   **Multi-Turn Tool Execution**: Continuous backend loops that execute custom calendar, task, weather, and calculation tools, returning visual validation badges directly in the chat feed.
*   **Real-time Synchronization**: Interactive sidebar tabs featuring a live calendar scheduler, task list checkmarks, and a real-time notes search engine.

---

## Architectural Layout

Aether uses a high-efficiency hybrid cloud model:
*   **Client Tier**: React static assets compiled with Vite, styled with Tailwind CSS, and hosted globally via Vercel.
*   **Application Tier**: Stateful Node.js and Express backend hosted on Render, maintaining session memory and executing tool logic via the official `@google/generative-ai` SDK using the `gemini-2.5-flash` model.

---

## Local Development Setup

To run Aether locally on your system:

### 1. Install Dependencies
Run this command in the project root:
```bash
npm install
```

### 2. Configure Environment Variables
Create a file named `.env` in the root directory and add your credentials:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 3. Launch Development Servers
Run the concurrent task runner to start both Express and Vite:
```bash
npm run dev
```
*   The frontend workspace will be active at: `http://localhost:3000`
*   The backend API server will be listening at: `http://localhost:3001`

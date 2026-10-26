# Matter — Final Project Submission Details

This document contains pre-filled submission form fields ready to copy and paste into the evaluation portal, followed by the final compliance verification checklist.

---

## Form Fields (Copy & Paste)

### Project Name
```text
Matter
```

### Student Name
```text
<STUDENT_NAME>
```

### Problem Statement
```text
Most visual workflow tools are either purely static frontend mockups that simulate execution in browser memory or heavyweight enterprise platforms with high operational friction and complex setup. Students and developers lack an accessible, transparent environment to understand and inspect how multi-step logic, branching, and data transformations execute under real runtime conditions. Matter bridges this gap by combining an interactive node canvas with a genuine server-side execution engine, providing live telemetry over Server-Sent Events, granular node inspection, and clear error recovery.
```

### GitHub Repository
```text
https://github.com/amannarang04/Matter
```

### Deployed Application (Live Frontend)
```text
https://matter-delta.vercel.app/
```

### Backend Health Check URL
```text
https://matter-api-smno.onrender.com/api/health
```

### Demo Video Link
```text
<DEMO_VIDEO_LINK>
```

### Tech Stack
```text
React 19, Vite, @xyflow/react, Tailwind CSS, Zustand, Node.js, Express, Mongoose, MongoDB Atlas, Server-Sent Events (SSE), Vitest, Vercel, Render
```

### Major Features (5 Highlights)
```text
1. Interactive visual canvas with 6 typed nodes (Trigger, Input, Transform, Condition, Delay, Output) and drag-and-drop wiring.
2. Server-side DAG execution engine with cycle detection, topological sorting (Kahn's algorithm), and boolean conditional branching.
3. Real-time execution telemetry streamed over Server-Sent Events (SSE) with live node badges, per-node duration, and animated edge pulses.
4. Comprehensive debugging with node-level inspection, plain-English error handling, and a one-click "Fix and rerun" workflow CTA.
5. Full workflow persistence and run history in MongoDB Atlas, including one-click historical run snapshot replay directly on the canvas.
```

---

## Final Submission Verification Checklist

Based on official evaluation guidelines:

- [x] **Functional App**: Application is deployed, loads reliably, and performs end-to-end execution across client and server.
- [x] **Clear Problem & Target Users**: Problem statement, target personas (students, educators, developers), and engineering solutions are explicitly defined.
- [x] **Core Workflows Functional**: Graph authoring, template loading, validation, server execution, live status streaming, and persistence operate as intended.
- [x] **Meaningful Engineering Logic**: Real DAG resolution using Kahn's topological sort, safe sandboxed handler registry (no `eval` or `Function`), proxy header handling, and concurrency locks.
- [x] **Failures Handled Gracefully**: Cycle detection, schema validation, divide-by-zero traps, timeout protection (`finally` cleanup), and server startup recovery for interrupted runs.
- [x] **No Secrets Exposed**: `.env` files git-ignored, no database credentials or API secrets committed to the repository.
- [x] **Source Code Accessible**: Repository is public on GitHub with clean folder organization (`client/`, `server/`, `docs/`).
- [x] **Git History Reflects Cadence**: Progressive, descriptive conventional commits (`feat:`, `fix:`, `docs:`, `test:`) documenting genuine iterative engineering.
- [x] **Comprehensive README**: Includes problem, architecture diagram, 60-second walkthrough, real endpoint schemas, models, and honest limitation disclosures.
- [x] **Architecture Documented**: High-level flow, component roles, Kahn's algorithm execution model, and data schemas thoroughly explained.
- [x] **Deployed Environment**: Frontend live on Vercel (`https://matter-delta.vercel.app/`), backend live on Render (`https://matter-api-smno.onrender.com`), database on MongoDB Atlas.
- [ ] **Demo Video Accessible**: 4 to 5 minute walkthrough video recorded, uploaded, and link verified (`<DEMO_VIDEO_LINK>`).
- [ ] **Incognito Link Verification**: Tested frontend, backend health check, and demo video in a fresh incognito browser window without login prompts.
- [ ] **Submission Submitted On Time**: Form submitted before deadline (**27 Oct 2026, 11:59 PM IST**).

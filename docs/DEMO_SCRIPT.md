# Matter — Demo Video Recording Script

A structured 4 to 5 minute walkthrough script for recording the Matter submission demo video.

---

## Pre-Recording Checklist

Before hitting record, complete these quick preparation steps:

1. **Wake up the backend**: Open [https://matter-api-smno.onrender.com/api/health](https://matter-api-smno.onrender.com/api/health) in a browser tab at least 1 minute before recording so Render's free-tier container spins up and responds with `{"status":"ok"}`.
2. **Clean browser window**: Open a dedicated browser window (Incognito or clean profile) with bookmarks bar hidden (`Ctrl+Shift+B` / `Cmd+Shift+B`).
3. **Close background tabs**: Close Slack, Discord, email, and any notification-generating apps.
4. **Optimal zoom**: Set browser zoom to **110%–125%** (`Ctrl +` / `Cmd +`) so canvas labels, node configuration inputs, and execution telemetry are crisp and easily readable on a 1080p recording.
5. **Audio & video check**: Test microphone input levels (avoid clipping or background hiss) and ensure screen recorder captures full display resolution at 30 or 60 fps.
6. **Live URL ready**: Navigate to [https://matter-delta.vercel.app/](https://matter-delta.vercel.app/).

---

## Video Script

| Time | What I do on screen | What I say |
| :--- | :--- | :--- |
| **0:00 – 0:30** | Show the live Matter canvas in the browser. Mouse hovers over the header and node sidebar. | "Most visual workflow builders are either mockups that only simulate state in the browser, or heavy enterprise tools with steep learning curves. Matter solves this by pairing a lightweight visual canvas with a real backend execution engine that evaluates each node on a server, streams status updates live, and lets you debug every step. It is built for students learning computational logic, developers prototyping multi-step workflows, and anyone who wants to see data flow through real branches and transformations." |
| **0:30 – 1:15** | Click **Templates** in the top navigation and select the **E-Commerce Order Processing** example. Click across a few nodes (Trigger, Input, Condition, Transform, Output) to display their configuration panels in the right sidebar. Point to the node palette. | "Let’s look at how workflows are constructed. Matter supports six node types: Manual Triggers to kick off execution, Input nodes for static values or payloads, Transform nodes for arithmetic, string manipulation, and JSON extraction, Condition nodes for conditional branching, Delay nodes for simulated async pauses, and Output nodes to format final results. Every node is configured through this inspector on the right with strict type schemas—no raw code or unpredictable eval statements." |
| **1:15 – 2:00** | Click the **Run Workflow** button in the header. The canvas immediately starts lighting up: nodes switch from idle to yellow 'running', animated dashed lines pulse along the active edges, nodes turn green 'completed', and the inactive branch marks as gray 'skipped'. The bottom run log and status banner update to 'completed'. | "When I click Run, the client validates the graph, assigns a fresh run ID, and posts it to our Express engine. The server computes execution order using Kahn’s topological sort algorithm and streams live execution events back to the client over Server-Sent Events. Notice how the condition evaluated whether our total order value exceeded 100 dollars: because it was true, the discount branch executed, while the standard branch was marked skipped without crashing the pipeline." |
| **2:00 – 2:30** | Click on the **Calculate Final Price** Transform node. The right sidebar opens to reveal the **Execution Telemetry** panel beneath the configuration fields. Scroll through the Inputs, Outputs, and Duration fields. | "Once a run finishes, the node inspector provides full telemetry. Clicking on this Transform node shows exactly what data came in, the evaluated arithmetic operation, the resulting output value, and the precise server execution duration down to the millisecond. This gives you complete visibility into the run context at every hop." |
| **2:30 – 3:15** | Click on the Transform node. In the inspector, change the operation to **Divide** and set the right operand to **0**. Click **Run Workflow**. The Transform node turns red with a 'failed' badge, and a top error banner appears stating *'Division by zero'*. Click the **Fix and rerun** button on the banner. Update the right operand back to **2** and click Run. The workflow passes cleanly. | "Now let's see how Matter handles execution failures. If I change this calculation to divide by zero and run the workflow, the engine catches the arithmetic error immediately. The failing node highlights red, downstream nodes halt safely, and an error banner identifies the issue in plain English. Clicking 'Fix and rerun' instantly focuses the offending node so I can correct the value, re-execute, and see the run succeed without losing my workflow state." |
| **3:15 – 3:50** | Refresh the browser tab (`F5` or `Ctrl+R`). The workflow and layout reload instantly. Click **History** in the top navigation. The modal lists recent execution runs with timestamps, status badges, and duration. Click **View on canvas** on an earlier run. A purple banner appears reading *'Viewing historical run snapshot'*, and historical node badges render. Click **Exit Replay**. | "Matter persists everything to MongoDB Atlas. If I refresh the browser, the workflow and canvas layout reload immediately. When I open the History modal, we see every past run with its overall status, start timestamp, and total duration. Clicking 'View on canvas' loads that historical run’s exact node states and output snapshots directly onto the graph. An amber banner makes it clear we are in replay mode, and clicking Exit Replay returns us to live editing." |
| **3:50 – 4:20** | Show the full interface: canvas, sidebar, status bar, and header. Optionally split screen or show terminal/repo for a brief moment. | "Under the hood, Matter uses React Flow and Zustand on the frontend, and an Express engine with Mongoose on the backend. Workflows are validated for cycle prevention and schema integrity before execution. Execution uses an explicit handler registry—no dangerous eval or Function constructors. Real-time updates stream over HTTP Server-Sent Events with proxy buffering headers, backed by MongoDB collections for workflows, runs, and execution logs." |
| **4:20 – 4:35** | Look back at the clean, completed canvas. | "Matter brings transparency, strict safety, and live observability to visual logic. You can test the live application at matter-delta.vercel.app, and all source code is open on GitHub. Thanks for watching." |

---

## Post-Recording Quick Checklist

- [ ] Video duration is between **4:00 and 5:00 minutes**.
- [ ] Spoken audio is crisp with minimal background noise.
- [ ] Text and canvas badges are sharp and legible on screen.
- [ ] All required features were demonstrated: six node types, live SSE execution, branching with skipped node, inspector telemetry, divide-by-zero error handling with Fix and rerun, refresh persistence, history modal, and historical replay.
- [ ] Upload to YouTube (Unlisted or Public) or Google Drive (configured with *'Anyone with the link can view'*).
- [ ] Paste the final URL into `README.md` and `docs/SUBMISSION.md` replacing `<DEMO_VIDEO_LINK>`.

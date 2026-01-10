## Updated task description for AI agent

Build a **browser-only (front-end only) web application** for Japanese vocabulary review. The app must run entirely in the browser (no backend for the app) and fetch vocabulary data from an existing service (default: `http://localhost:3000`, configurable).

### 1) Data source integration

* Provide a **configurable base URL** for the vocabulary service (default `http://localhost:3000`).
* The agent may use the service’s **root endpoint (`/`)** during development to learn which endpoints exist, but the shipped app **must not require endpoint discovery at runtime**. It should call the required endpoint(s) directly.
* Fetch **all vocabulary reviewed “today”** from the appropriate endpoint(s).
* Some service endpoints may return **duplicate review entries** for the same vocabulary; the app must **deduplicate** the “reviewed today” items before building the review queue.

### 2) Review session flow

* Build a **single review queue** from the deduplicated “reviewed today” vocabulary items.
* Present **one item at a time**:

  * Display the **English definition**.
  * Provide a **text input** where the user types the **Japanese definition or Japanese spelling** (including kanji).
* On submit, show a **side-by-side comparison** of:

  * the user’s input
  * the correct Japanese answer from the service
* If the user’s input text is **exactly identical** to the correct answer text, visually indicate this by rendering the comparison with a **green outline**.

### 3) Grading interactions

* Provide two grading actions: **“Good”** and **“Not good”**.
* While the comparison view is visible, pressing the **spacebar** must be treated as a **“Good”** judgment (i.e., keyboard shortcut for marking correct).

### 4) Scheduling / rescheduling behavior

* If the user marks an item **Good on the first try**, remove it from the queue and add it to a **“reviewed correctly” stack/list** for this session.
* If the user marks an item **Not good** (or otherwise indicates it was incorrect):

  * The item must be **rescheduled with spacing**, not immediately next.
  * Implement spacing by **reinserting later in the queue** (example: ~**10 items** later).
  * A rescheduled item must be scheduled to appear **multiple additional times at additional intervals** (not just one reappearance), to reinforce learning. (Implementation detail left open, but it must produce multiple spaced re-prompts after an incorrect attempt.)

### 5) State management and persistence (no server)

* All state must live in the browser and **persist across page reloads**, including at minimum:

  * queue order and current position
  * attempt tracking needed to detect “first try”
  * rescheduling plan/state for items that were incorrect
  * “reviewed correctly” stack/list
  * session counters/statistics
  * configured base URL
* Provide a control to **clear/reset all persisted data** and return to a clean state.

### 6) Statistics

* Show basic session statistics, at minimum:

  * **how many words have been reviewed so far in this session** (consistent definition of “reviewed” based on grading events).

### 7) Debug/inspection UI (collapsible)

* Provide collapsible (collapsed by default) debug sections showing:

  * a **visual representation of the current queue** (upcoming items in order)
  * a **visual representation of completed/reviewed items** (e.g., the “reviewed correctly” list)

### 8) UI/UX constraints

* UI should be **minimal / spartan**.
* Use **large, readable text**, especially for Japanese input/kanji visibility.
* Optimize the loop for speed: prompt → type → submit → compare → grade → next (including the spacebar shortcut on the compare screen).

### 9) Operational constraints

* The app must be runnable entirely in the browser (front-end only).
* Network interaction is limited to fetching from the configured vocabulary service endpoint(s).
* Handle service errors gracefully (unreachable base URL, unexpected response, etc.) without requiring a backend.

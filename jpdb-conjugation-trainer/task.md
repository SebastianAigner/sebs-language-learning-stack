Goal

Build an application that helps the user practice Japanese verb conjugations, specifically ichidan and godan verbs.

Vocabulary source (local service)
	•	There is an existing service running on localhost:3000.
	•	This service exposes what vocabulary the user reviewed today in their spaced repetition system, including the word type.
	•	The application must introspect this service (e.g., using curl) to discover the actual endpoints.
	•	Do not invent endpoints.
	•	The root endpoint describes other endpoints.

Selecting review items
	•	Fetch all vocabulary reviewed today.
	•	Filter the items to include only:
	•	ichidan verbs
	•	godan verbs
	•	These filtered verbs become the day’s review queue.

Conjugation targets to practice

For each reviewed ichidan/godan verb, the user may be asked to produce one of these forms, each in casual and polite:
	•	Non-past (present/future) affirmative
	•	Past affirmative
	•	Negative (non-past)
	•	Negative-past
	•	Progressive (e.g., -ている)
	•	Progressive-past (e.g., -ていた)
	•	Negative progressive (e.g., -ていない)
	•	Negative progressive-past (e.g., -ていなかった)
	•	Te-form (て-form)

Review flow (UI + behavior)
	•	Minimal frontend, vanilla TypeScript (no React yet).
	•	The UI should include:
	•	A central free-text input field.
	•	A prompt showing the dictionary form of the current verb.
	•	A prompt indicating the target form (one of the items listed above).
	•	The user types their conjugation.
	•	The application grades it using an LLM (via OpenRouter).
	•	If correct:
	•	Play the “correct” sound.
	•	Advance according to the scheduling/rescheduling logic (see below).
	•	If incorrect:
	•	Play the “wrong” sound.
	•	Show the correct solution / explanation by displaying the LLM output.
	•	Provide a Next button to continue.

Grading via OpenRouter (LLM)
	•	Use OpenRouter for grading.
	•	Use the official OpenRouter SDK for TypeScript (do not write a custom client).
	•	The grading prompt should be effectively:
	•	“I’m a Japanese learner. I was tasked to conjugate this verb into this form. Here is my reply. Is it correct?”
	•	If correct, the model response must include a star emoji.
	•	Otherwise include a sparkle emoji.
	•	The application determines correctness by checking for the emoji in the model response.

API key handling
	•	OpenRouter requires an API key.
	•	Read it from a file named OpenRouter.txt in the project directory.

Scheduling / rescheduling
	•	Do not use a simple “wrong goes to end of queue” rule.
	•	Instead:
	•	Use a similar rescheduling algorithm to what is implemented in the separate project “Review Transcriber” (path provided below).

Model configuration
	•	The LLM model must be configurable via the UI:
	•	A dropdown and a free-text field.
	•	Default model: grok-4.
	•	Persist the model selection in browser localStorage.

Persistence
	•	Persist the current review state (queue/progress/scheduling state) in the browser.
	•	Use the Review Transcriber project (path provided below) as reference for persistence patterns and UI inspiration.

Audio feedback
	•	From the Review Transcriber project (path provided below), copy the “correct” and “wrong” audio samples into this new project.
	•	Play them on correct vs incorrect answers.

Dev setup / quality gates
	•	Entire project in TypeScript.
	•	Add:
	•	Proper linting
	•	Type checking as part of normal dev/build so it doesn’t get skipped
	•	Basic tests
	•	Integration tests that hit the real OpenRouter API to confirm correct SDK usage and end-to-end behavior

Server port
	•	Do not run the app on port 8080 (it’s already used).
	•	Use a different port.
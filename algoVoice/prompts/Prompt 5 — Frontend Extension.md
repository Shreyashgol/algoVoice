Extend the EXISTING VoiceForge Next.js frontend.

Do not rebuild the frontend.

First inspect:

frontend/app/page.tsx
frontend/lib/servers.ts
frontend/lib/constants.ts

Preserve the existing text-to-voice workflow exactly.

Add a document mode to the existing Studio.

UI concept:

[ Text ] [ Document ]

Text mode:
existing VoiceForge workflow

Document mode:

Upload PDF
↓
Voice instruction
↓
Language
↓
Generate audiobook
↓
Progress
↓
Audio player
↓
Download

Requirements:

1. Reuse the existing design system.

2. Do not introduce a new UI framework.

3. Do not rewrite page.tsx unnecessarily.

4. Keep existing server fallback behavior.

5. Show meaningful generation states:

Uploading
Extracting text
Preparing narration
Generating audio
Completed
Error

6. Handle API failures gracefully.

7. Keep the current text-generation functionality working.

8. Do not add authentication.

9. Do not add a database.

10. Do not change unrelated sections of the website.

Run the Next.js build after modification.

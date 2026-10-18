You are working inside the EXISTING GitHub repository:

https://github.com/Jivit87/VoiceForge

IMPORTANT:
This is an extension of the existing VoiceForge project.

DO NOT create a new project.
DO NOT create a second application.
DO NOT replace the existing architecture unnecessarily.
DO NOT rewrite the existing frontend from scratch.
DO NOT remove existing VoiceForge functionality.

==================================================
CORE PRODUCT DIRECTION
======================

Evolve VoiceForge from a simple text-to-speech generator into:

"An AI-powered voice and narration studio where users can either
design their own narrator or let AI intelligently determine the
appropriate voice and tone."

The user must have TWO choices.

MODE A — USER-DESIGNED VOICE

The user explicitly specifies:

* narrator type
* gender
* approximate age
* accent
* tone
* emotion
* speaking pace
* style
* personality

Example:

"Deep British male narrator, around 40,
calm, authoritative, slow and dramatic."

VoiceForge should preserve the user's preferences.

MODE B — AI-SELECTED VOICE

The user does not provide a detailed voice instruction.

Example:

"Turn this article into a documentary narration."

VoiceForge should automatically determine an appropriate voice profile.

The AI should analyze:

* content type
* subject matter
* writing style
* emotional context
* intended audience
* narration purpose

Then produce a structured voice specification.

Example:

Input:
"Create a cinematic documentary narration about space."

AI-generated voice specification:

{
"gender": "male",
"age": "35-50",
"accent": "neutral",
"tone": "authoritative",
"emotion": "calm",
"pace": "slow",
"style": "documentary",
"voice_prompt": "A mature, authoritative male documentary narrator..."
}

This voice specification is then passed to Qwen3-TTS.

==================================================
IMPORTANT ARCHITECTURE
======================

The architecture should become:

```
                USER
                  │
                  ▼
          Text / Document
                  │
                  ▼
          Voice Preference
            /           \
           /             \
  User specified      Not specified
         │                  │
         │                  ▼
         │              Groq AI
         │                  │
         │                  ▼
         │          Voice Specification
         │                  │
         └──────────┬───────┘
                    ▼
            Voice Prompt
                    │
                    ▼
              Qwen3-TTS
                    │
                    ▼
                 Audio
```

Do not allow Groq to directly generate audio.

Groq = intelligence / orchestration

Qwen3-TTS = speech synthesis

==================================================
VOICE SELECTION LAYER
=====================

Create a small reusable abstraction:

resolve_voice()

It should conceptually perform:

if user provided voice preferences:
use those preferences
else:
ask Groq to determine the appropriate voice profile

The function should return a normalized voice instruction.

Example:

resolve_voice(
user_voice="",
text="A dramatic documentary about the ocean"
)

returns something similar to:

"A mature, calm documentary narrator with a deep,
authoritative voice, measured pace, and subtle dramatic emotion."

If the user provides:

"young female, energetic, Indian accent"

do NOT override the user's choice.

Instead refine it only when necessary.

==================================================
VOICE PREFERENCE INPUT
======================

The application should eventually support structured preferences:

Narrator:
[ AI Select ] [ Male ] [ Female ]

Age:
[ AI Select ] [ Young ] [ Adult ] [ Mature ]

Accent:
[ AI Select ] [ British ] [ American ] [ Indian ] [ Neutral ] ...

Tone:
[ AI Select ] [ Calm ] [ Warm ] [ Serious ] [ Energetic ] ...

Emotion:
[ AI Select ] [ Neutral ] [ Happy ] [ Dramatic ] [ Empathetic ] ...

Pace:
[ AI Select ] [ Slow ] [ Normal ] [ Fast ]

Style:
[ AI Select ] [ Documentary ] [ Audiobook ] [ Podcast ]
[ News ] [ Advertisement ] [ Storytelling ]

The user should also be able to enter:

"Custom voice instruction"

Example:

"Warm female narrator with a slight Indian accent,
friendly and conversational."

==================================================
AI VOICE DISCOVERY
==================

When the user selects AI Select / leaves the voice unspecified:

Use Groq to infer the voice characteristics from the content.

The AI should return structured JSON.

Example:

{
"voice_type": "documentary_narrator",
"gender": "male",
"age": "adult",
"accent": "neutral",
"tone": "authoritative",
"emotion": "calm",
"pace": "slow",
"style": "documentary",
"instruction": "A mature authoritative male documentary narrator..."
}

Use structured output if supported by the selected Groq model.

Validate the result before passing it to Qwen.

If parsing fails, use a safe default voice instruction.

Default:

"A clear, natural, warm narrator with a neutral accent,
medium pace and professional delivery."

==================================================
DO NOT CONFUSE "SEARCH" WITH "VOICE DISCOVERY"
==============================================

The first implementation should NOT require external web search.

"Search" means:

analyze the user's content and determine the appropriate
voice profile.

Do NOT search random websites for voices.

Do NOT download external voice samples.

Do NOT clone real people's voices.

Use Qwen3-TTS VoiceDesign to synthesize the selected voice
from the natural-language voice instruction.

==================================================
GROQ
====

Use Groq as the reasoning layer.

API key MUST come from Google Colab Secrets:

from google.colab import userdata

GROQ_API_KEY = userdata.get("GROQ_API_KEY")

Never hard-code the API key.

Never print the API key.

Groq responsibilities:

1. narration preparation
2. voice selection
3. voice refinement
4. document understanding
5. chunk preparation

Groq must NOT generate the final audio.

==================================================
QWEN3-TTS
=========

Keep:

Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign

Qwen responsibilities:

Natural-language voice description
+
Narration text
↓
Audio

Do not replace Qwen3-TTS.

==================================================
DOCUMENT WORKFLOW
=================

Eventually support:

PDF
TXT
DOCX

Pipeline:

Document
↓
Text extraction
↓
Content understanding
↓
Narration preparation
↓
Voice resolution
↓
Voice instruction
↓
Chunking
↓
Qwen3-TTS
↓
Audio segments
↓
Combined audio

==================================================
PHASED IMPLEMENTATION
=====================

PHASE 1:

Create:

Notebook/01_voiceforge_groq_tts.ipynb

Implement:

Text
↓
Groq
↓
Voice resolution
↓
Qwen3-TTS
↓
WAV

Support both:

explicit voice instruction

and:

AI-selected voice.

Keep this notebook minimal.

---

PHASE 2:

Create:

Notebook/02_voiceforge_pdf_to_voice.ipynb

Implement:

PDF
↓
Text extraction
↓
Groq
↓
Voice resolution
↓
Qwen3-TTS
↓
WAV

---

PHASE 3:

Create:

Notebook/03_voiceforge_pdf_groq_tts.ipynb

Combine the working components cleanly.

---

PHASE 4:

Create:

Notebook/04_voiceforge_long_document.ipynb

Add:

chunking
sequential generation
voice consistency
audio concatenation

IMPORTANT:

Resolve the voice ONCE for the entire document.

Do NOT ask Groq to choose a different voice for every chunk.

Correct architecture:

Document
↓
Groq analyzes document
↓
ONE voice profile
↓
Split narration
↓
Chunk 1 ──┐
Chunk 2 ──┤
Chunk 3 ──┤
Chunk N ──┘
↓
Same voice instruction
↓
Audio segments
↓
Combined audiobook

This is critical for voice consistency.

---

PHASE 5:

Extend the existing FastAPI backend.

Keep:

POST /generate

Add:

POST /generate-document

Do not break the existing endpoint.

---

PHASE 6:

Extend the existing Next.js frontend.

Do not rebuild the frontend.

Add:

Voice Selection

with:

AI Select
Custom
Structured preferences

Example:

VOICE

○ Let AI choose
○ Customize voice

If Customize:

Narrator
Age
Accent
Tone
Emotion
Pace
Style
Custom instruction

The final UI should remain simple.

==================================================
DEFAULT BEHAVIOR
================

If the user gives no voice information:

Automatically select a suitable voice.

If the user specifies some preferences:

Respect them.

If the user specifies all preferences:

Do not override them.

If the user gives contradictory preferences:

Ask Groq to resolve the contradiction conservatively.

Example:

"fast and very calm"

The system may resolve this to:

"medium-fast pace with calm delivery."

==================================================
SAFETY / IDENTITY
=================

Do not implement voice cloning.

Do not imitate real people.

Do not search for celebrity voices.

The system should generate fictional voice profiles.

==================================================
IMPLEMENTATION PHILOSOPHY
=========================

Use minimal code.

Prefer:

small functions
simple data structures
clear notebook cells
easy debugging

Avoid:

unnecessary frameworks
microservices
databases
Redis
Celery
Kubernetes
vector databases
RAG
complex agent frameworks

Do not over-engineer.

==================================================
GIT / FILE SAFETY
=================

Before modifying anything:

inspect the existing repository.

Preserve existing functionality.

Do not modify unrelated files.

After each phase:

verify syntax
verify imports
verify model loading
verify generation

STOP after each phase.

Do not automatically implement all phases.

Start with PHASE 1 only.

After Phase 1 report:

1. Files created
2. Files modified
3. Dependencies
4. Voice-selection behavior
5. Explicit-voice test
6. AI-selected-voice test
7. TTS test
8. Any errors

Then wait for the next instruction.

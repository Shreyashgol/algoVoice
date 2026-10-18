Implement PHASE 4 (Long Documents).

Create:

Notebook/04_voiceforge_long_document.ipynb

Add:

* chunking
* sequential generation
* voice consistency
* audio concatenation

==================================================
CRITICAL ARCHITECTURE: VOICE CONSISTENCY
========================================

Resolve the voice ONCE for the entire document.

Do NOT ask Groq to choose a different voice for every chunk.

Correct pipeline:

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

==================================================
REQUIREMENTS
============

1. PDF / Long text extraction using pypdf.
2. Script preparation via Groq.
3. Voice resolution (explicit user preference OR AI-selected profile inferred once).
4. Text chunking: split script on sentence/paragraph boundaries into manageable segments (e.g. 150-300 words).
5. Sequential audio generation using Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign.
6. Seamless audio concatenation into a final master WAV file.
7. Playback inside Colab using IPython.display.Audio.

Implement PHASE 1 only.

Create:

Notebook/01_voiceforge_groq_tts.ipynb

Build the smallest working VoiceForge intelligence pipeline.

==================================================
PIPELINE
========

User text
↓
User voice preference
↓
Voice resolver
↓
Groq
↓
Voice instruction
↓
Qwen3-TTS
↓
WAV

==================================================
TWO MODES
=========

MODE 1 — EXPLICIT VOICE

Example:

voice_preference = """
Deep British male narrator,
calm, authoritative, slow and dramatic.
"""

The system must preserve this preference.

Do not unnecessarily rewrite it.

==================================================

MODE 2 — AI VOICE

Example:

voice_preference = ""

text = """
The universe is billions of years old...
"""

Since the user did not specify a voice:

Groq must determine an appropriate narrator.

Ask Groq to return:

{
"voice_type": "...",
"gender": "...",
"age": "...",
"accent": "...",
"tone": "...",
"emotion": "...",
"pace": "...",
"style": "...",
"instruction": "..."
}

Use the "instruction" field as the Qwen3-TTS voice instruction.

==================================================
FUNCTIONS
=========

Keep only these core functions:

generate_narration(text)

resolve_voice(text, voice_preference)

generate_audio(text, voice_instruction)

==================================================
BEHAVIOR
========

resolve_voice():

If voice_preference is not empty:

```
return the user's voice preference
```

Otherwise:

```
call Groq
infer appropriate voice
return generated voice instruction
```

==================================================
DEFAULT
=======

If Groq fails to produce valid voice information:

Use:

"A clear, natural, warm narrator with a neutral accent,
medium pace and professional delivery."

==================================================
TEST 1
======

Test explicit voice:

text = """
Artificial intelligence is changing the world.
"""

voice_preference = """
Deep British male narrator,
calm and authoritative.
"""

Verify that the user's preference is used.

==================================================
TEST 2
======

Test AI-selected voice:

text = """
The ancient city slept beneath the moonlight.
A distant bell echoed through the narrow streets.
"""

voice_preference = ""

Verify that Groq creates a suitable voice instruction.

Print:

Generated voice instruction:
...

==================================================
TTS
===

Use:

Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign

Generate WAV audio.

Play the audio inside Colab.

==================================================
IMPORTANT
=========

Do NOT add:

PDF
FastAPI
ngrok
frontend
database
chunking
RAG
agents
external voice search

Only implement:

Groq
+
voice resolution
+
Qwen3-TTS

Keep the notebook as small and understandable as possible.

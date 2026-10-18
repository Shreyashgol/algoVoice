Implement PHASE 2 only.

Create:

Notebook/02_voiceforge_pdf_to_voice.ipynb

Use the working concepts from:

Notebook/01_voiceforge_groq_tts.ipynb

Do not modify the existing application.

Add only:

PDF upload
↓
PDF text extraction
↓
Groq narration preparation
↓
Qwen3-TTS
↓
WAV

Use:

pypdf

The notebook should:

1. Upload a PDF using Colab.
2. Extract text from all pages.
3. Handle pages where extract_text() returns None.
4. Print basic extraction statistics.
5. Send the extracted text to Groq.
6. Generate narration-ready text.
7. Send the narration to Qwen3-TTS.
8. Save the generated WAV.
9. Play the audio.

For this phase, process only a reasonable text limit.

Do NOT implement:

* chunking
* multiprocessing
* background jobs
* FastAPI
* frontend changes
* database
* RAG

Keep the code beginner-friendly and minimal.

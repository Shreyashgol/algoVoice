Extend the EXISTING VoiceForge backend.

Do not create another backend application.

First inspect:

Notebook/Colab_Notebook.ipynb

Understand the current FastAPI implementation.

Preserve:

GET /
POST /generate

Add:

POST /generate-document

The existing /generate endpoint must remain backward compatible.

The new endpoint should accept a document-generation request containing:

* uploaded PDF
* voice instruction
* language

Pipeline:

PDF
↓
Text extraction
↓
Text chunking
↓
Groq narration preparation
↓
Qwen3-TTS
↓
Audio combination
↓
Response

Do not introduce authentication.

Do not introduce a database.

Do not modify the existing frontend yet.

Keep the implementation compatible with the existing Colab GPU workflow.

Return useful errors for:

invalid PDF
empty PDF
missing text
Groq failure
TTS failure

Verify that the original /generate endpoint still works.

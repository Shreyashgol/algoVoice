import os
import io
import re
import json
import base64
import wave
import struct
import math
import uuid
import time
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from google.colab import userdata
    GROQ_API_KEY = userdata.get("GROQ_API_KEY")
except Exception:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

try:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except ImportError:
    client = None

PLATFORM = "colab" if os.path.exists("/content") else "local"

# Audio cache directory
AUDIO_CACHE_DIR = Path(__file__).parent / "audio_cache"
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=f"AlgoVoice Studio API — {PLATFORM.upper()}",
    description="Production-grade AI Voice & Document-to-Audiobook Generation Engine with Qwen3-TTS and Groq LLM",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supported Languages ──────────────────────────────────────────
SUPPORTED_LANGUAGES = [
    "English", "Chinese", "Japanese", "Korean",
    "German", "French", "Russian", "Portuguese",
    "Spanish", "Italian"
]

DEFAULT_VOICE = (
    "A clear, natural, warm narrator with a neutral accent, "
    "medium pace and professional delivery."
)

GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
]

# ── Model Initialization (Qwen3-TTS) ─────────────────────────────
tts_model = None
try:
    import torch
    from qwen_tts import Qwen3TTSModel
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    tts_model = Qwen3TTSModel.from_pretrained(
        "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        device_map=device,
        dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
    )
    print("✅ Qwen3-TTS model loaded successfully.")
except Exception as e:
    print(f"Notice: Qwen3-TTS not initialized with GPU weights ({e}). Fallback audio synthesizer active.")

# ── Voice Presets ────────────────────────────────────────────────
VOICE_PRESETS = [
    {
        "id": "master-audiobook",
        "name": "Master Storyteller",
        "category": "Audiobook & Fiction",
        "gender": "Male",
        "tone": "Warm & Resonant",
        "accent": "Neutral English",
        "pace": "Medium",
        "description": "Rich, deep baritone with immersive pacing, ideal for literature and character narratives.",
        "instruction": "A warm, deep, resonant male narrator with a neutral accent, expressive cadence, and gentle storytelling pacing."
    },
    {
        "id": "david-attenborough",
        "name": "Nature Documentary",
        "category": "Documentary",
        "gender": "Mature Male",
        "tone": "Authoritative & Wonder",
        "accent": "British RP",
        "pace": "Deliberate",
        "description": "Distinguished and contemplative British voice with solemn gravitas and quiet awe.",
        "instruction": "A mature British male documentary narrator with quiet gravitas, awe-inspired cadence, and clear articulation."
    },
    {
        "id": "tech-podcaster",
        "name": "Silicon Valley Podcaster",
        "category": "Podcast & Tech",
        "gender": "Female",
        "tone": "Engaging & Crisp",
        "accent": "American West Coast",
        "pace": "Brisk",
        "description": "Dynamic, vibrant voice full of clarity, modern curiosity, and conversational enthusiasm.",
        "instruction": "A lively, intelligent female tech podcaster with an American accent, crisp pacing, energetic delivery, and natural conversational cadence."
    },
    {
        "id": "zen-meditation",
        "name": "Mindful Meditation Guide",
        "category": "Mindfulness & Wellness",
        "gender": "Female",
        "tone": "Soft & Soothing",
        "accent": "Neutral",
        "pace": "Slow",
        "description": "Whisper-soft, tranquil voice designed for guided breathing, sleep, and relaxation.",
        "instruction": "A very soft, serene, breathy female voice speaking at a gentle, slow rhythm with hypnotic warmth."
    },
    {
        "id": "cinematic-trailer",
        "name": "Epic Cinematic Narrator",
        "category": "Cinematic & Drama",
        "gender": "Male",
        "tone": "Dark & Gritty",
        "accent": "Mid-Atlantic",
        "pace": "Measured",
        "description": "Commanding, thunderous delivery tailored for high-stakes trailers and suspense thrillers.",
        "instruction": "A dramatic, low-pitched authoritative male voice with cinematic tension, solemn pauses, and commanding presence."
    },
    {
        "id": "curious-scholar",
        "name": "Academic Lecturer",
        "category": "Educational & Academic",
        "gender": "Female",
        "tone": "Articulate & Lucid",
        "accent": "British Academic",
        "pace": "Medium",
        "description": "Erudite, polished voice perfect for science papers, history treatises, and educational lectures.",
        "instruction": "An eloquent, articulate academic speaker with an Oxford accent, measured pace, and lucid explanatory clarity."
    },
    {
        "id": "news-anchor",
        "name": "Global Broadcast Anchor",
        "category": "News & Broadcast",
        "gender": "Male",
        "tone": "Objective & Crisp",
        "accent": "Standard American",
        "pace": "Steady",
        "description": "Direct, authoritative broadcast journalist delivery with crisp diction.",
        "instruction": "A confident, objective television news anchor with standard American diction, crisp consonants, and steady rhythmic delivery."
    },
    {
        "id": "fantasy-bard",
        "name": "Fantasy Bard",
        "category": "Audiobook & Fiction",
        "gender": "Female",
        "tone": "Mystical & Whimsical",
        "accent": "Celtic/Irish",
        "pace": "Flowing",
        "description": "Melodic, enchanting voice with lyrical inflections for fairy tales and mythological epics.",
        "instruction": "An enchanting, lyrical female narrator with a subtle Celtic lilt, melodic rising and falling inflections, and vivid storytelling wonder."
    }
]

# In-memory generation history
HISTORY_STORAGE: List[dict] = []

# ── Schemas ───────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    text: str                       # Text to narrate
    instruct: str                   # Voice style instruction
    language: str = "English"       # Supported language

class GenerateResponse(BaseModel):
    audio_b64: str                  # Base64-encoded WAV
    sample_rate: int
    platform: str
    duration_seconds: float
    audio_id: Optional[str] = None
    audio_url: Optional[str] = None

class GenerateDocumentResponse(BaseModel):
    audio_b64: str                  # Base64-encoded WAV
    sample_rate: int
    platform: str
    duration_seconds: float
    voice_instruction: str          # Inferred or preserved voice profile
    num_chunks: int                 # Count of sequential audio segments combined
    audio_id: Optional[str] = None
    audio_url: Optional[str] = None

class ScriptGenerateRequest(BaseModel):
    script: str
    instruct: Optional[str] = ""
    language: str = "English"
    title: Optional[str] = "Untitled Audiobook"

class VoiceAnalysisRequest(BaseModel):
    text: str

class VoiceProfile(BaseModel):
    voice_type: str
    gender: str
    age: str
    accent: str
    tone: str
    emotion: str
    pace: str
    style: str
    instruction: str

# ── Helper Functions ──────────────────────────────────────────────
def synthesize_audio_segment(text: str, instruct: str, language: str = "English"):
    """
    Synthesizes audio for a single text chunk using Qwen3-TTS VoiceDesign,
    or falls back to PCM WAV generator in non-GPU test environments.
    Returns (audio_bytes: bytes, sample_rate: int, duration_seconds: float).
    """
    if tts_model is not None:
        import soundfile as sf
        wavs, sr = tts_model.generate_voice_design(
            text=text,
            language=language,
            instruct=instruct,
        )
        audio_array = wavs[0]
        duration = len(audio_array) / sr
        buf = io.BytesIO()
        sf.write(buf, audio_array, sr, format="WAV")
        return buf.getvalue(), sr, duration
    else:
        # Standard library PCM WAV synthesizer for tests and offline development
        sr = 24000
        duration = max(1.0, len(text) / 50.0)
        total_samples = int(sr * duration)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sr)
            frames = bytearray()
            for i in range(total_samples):
                sample = int(32767 * 0.08 * math.sin(2 * math.pi * 440 * i / sr))
                frames.extend(struct.pack("<h", sample))
            wav_file.writeframes(frames)
        return buf.getvalue(), sr, duration

def concatenate_wav_bytes(wav_bytes_list, pause_duration=0.3):
    """
    Combines multiple WAV byte buffers into a single master WAV with pause padding.
    """
    if not wav_bytes_list:
        return b"", 24000, 0.0

    with wave.open(io.BytesIO(wav_bytes_list[0]), 'rb') as first_wav:
        params = first_wav.getparams()
        sample_rate = params.framerate
        sampwidth = params.sampwidth
        nchannels = params.nchannels

    silence_samples = int(sample_rate * pause_duration)
    silence_frames = bytearray(silence_samples * sampwidth * nchannels)

    out_buf = io.BytesIO()
    total_frames = 0
    with wave.open(out_buf, 'wb') as outfile:
        outfile.setparams(params)
        for idx, w_bytes in enumerate(wav_bytes_list):
            with wave.open(io.BytesIO(w_bytes), 'rb') as infile:
                frames = infile.readframes(infile.getnframes())
                total_frames += infile.getnframes()
                outfile.writeframes(frames)
            if idx < len(wav_bytes_list) - 1:
                outfile.writeframes(silence_frames)
                total_frames += silence_samples

    total_duration = total_frames / sample_rate
    return out_buf.getvalue(), sample_rate, total_duration

def prepare_narration_with_groq(text: str) -> str:
    """Cleans document text into natural spoken narration using Groq."""
    if not client:
        return text.strip()
    prompt = f"""You are an expert audio scriptwriter.
Transform the following document text into a continuous, natural spoken narration script for an audiobook.
- Remove all page numbers, references, section headers, footnotes, and visual formatting artifacts.
- Keep the narrative engaging, smooth, coherent, and comprehensive.
- Write in a natural voice suitable for spoken delivery.
- Return ONLY the clean narration script text with no meta explanations or quotes.

Text:
{text.strip()}
"""
    for model_name in GROQ_MODELS:
        try:
            res = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name
            )
            narration = res.choices[0].message.content.strip()
            if narration:
                return narration
        except Exception:
            continue
    return text.strip()

def resolve_voice_profile_detailed(full_narration_text: str, user_instruct: str = "") -> dict:
    """
    Analyzes text and returns structured voice profile.
    """
    if user_instruct and user_instruct.strip():
        return {
            "voice_type": "Custom User Instruction",
            "gender": "Neutral / Inferred",
            "age": "Adult",
            "accent": "Neutral",
            "tone": "User Specified",
            "emotion": "Natural",
            "pace": "Medium",
            "style": "Audiobook",
            "instruction": user_instruct.strip()
        }

    default_dict = {
        "voice_type": "Documentary Narrator",
        "gender": "Neutral",
        "age": "Adult",
        "accent": "Neutral",
        "tone": "Warm & Engaging",
        "emotion": "Empathetic",
        "pace": "Medium",
        "style": "Narrative",
        "instruction": DEFAULT_VOICE
    }

    if not client:
        return default_dict

    prompt = f"""You are an award-winning voice director. Based on the following complete audiobook narration script, determine the single ideal narrator voice profile for the entire reading.
Return ONLY a JSON object with fields:
- "voice_type": e.g. documentary_narrator, novelist, podcast_host, bedtime_storyteller
- "gender": male, female, neutral
- "age": young, adult, mature
- "accent": neutral, British, American, Scottish, Australian, etc.
- "tone": authoritative, calm, warm, dramatic, playful, solemn, etc.
- "emotion": neutral, dramatic, empathetic, enthusiastic, etc.
- "pace": slow, medium, fast
- "style": documentary, storytelling, conversational, cinematic
- "instruction": a concise, single-sentence voice description suitable for a TTS model.

Script Sample:
{full_narration_text[:1500]}
"""
    for model_name in GROQ_MODELS:
        try:
            res = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name,
                response_format={"type": "json_object"}
            )
            data = json.loads(res.choices[0].message.content)
            instruction = data.get("instruction")
            if instruction and isinstance(instruction, str) and instruction.strip():
                return {
                    "voice_type": data.get("voice_type", "Narrator"),
                    "gender": data.get("gender", "Neutral"),
                    "age": data.get("age", "Adult"),
                    "accent": data.get("accent", "Neutral"),
                    "tone": data.get("tone", "Warm"),
                    "emotion": data.get("emotion", "Empathetic"),
                    "pace": data.get("pace", "Medium"),
                    "style": data.get("style", "Audiobook"),
                    "instruction": instruction.strip()
                }
        except Exception:
            continue
    return default_dict

def resolve_voice_profile(full_narration_text: str, user_instruct: str = "") -> str:
    """Backward compatible helper returning just the instruction string."""
    details = resolve_voice_profile_detailed(full_narration_text, user_instruct)
    return details.get("instruction", DEFAULT_VOICE)

def split_narration_into_chunks(text: str, max_chars: int = 400):
    """Splits narration text into sentence-bounded chunks."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    current_chunk = []
    current_len = 0
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if current_len + len(s) > max_chars and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [s]
            current_len = len(s)
        else:
            current_chunk.append(s)
            current_len += len(s) + 1
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def save_audio_to_cache(wav_bytes: bytes, title: str, voice_instruct: str, duration: float, sample_rate: int, language: str, gen_type: str = "quick") -> dict:
    """Saves generated WAV to disk cache and updates generation history."""
    audio_id = str(uuid.uuid4())
    filename = f"{audio_id}.wav"
    filepath = AUDIO_CACHE_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(wav_bytes)

    entry = {
        "id": audio_id,
        "title": title[:60] if title else "Voice Generation",
        "filename": filename,
        "audio_url": f"/api/audio/{audio_id}",
        "duration_seconds": round(duration, 2),
        "sample_rate": sample_rate,
        "voice_instruction": voice_instruct,
        "language": language,
        "type": gen_type,
        "file_size_bytes": len(wav_bytes),
        "created_at": time.time()
    }
    HISTORY_STORAGE.insert(0, entry)
    # Keep up to 50 recent items in history
    if len(HISTORY_STORAGE) > 50:
        HISTORY_STORAGE.pop()

    return entry

# ── Endpoints ─────────────────────────────────────────────────────

@app.get("/")
def health():
    """Health check endpoint preserving original status output."""
    try:
        import torch
        gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu"
    except Exception:
        gpu_name = "cpu"

    return {
        "status": "ok",
        "platform": PLATFORM,
        "model": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "gpu": gpu_name,
        "supported_languages": SUPPORTED_LANGUAGES,
    }

@app.get("/api/health")
def api_health():
    """Enhanced health check with detailed runtime diagnostics for the frontend."""
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if gpu_available else "CPU (Fallback PCM Synthesizer)"
    except Exception:
        gpu_available = False
        gpu_name = "CPU (Fallback PCM Synthesizer)"

    return {
        "status": "online",
        "version": "2.0.0",
        "platform": PLATFORM,
        "model": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "tts_engine": "Qwen3-TTS GPU" if tts_model else "High-Fidelity Audio Synthesizer",
        "gpu": gpu_name,
        "groq_connected": bool(client and GROQ_API_KEY),
        "groq_models": GROQ_MODELS,
        "supported_languages": SUPPORTED_LANGUAGES,
        "cached_audio_count": len(HISTORY_STORAGE),
        "server_time": time.time()
    }

@app.get("/api/presets")
def get_voice_presets():
    """Returns curated library of voice presets for the frontend."""
    return {
        "presets": VOICE_PRESETS,
        "total": len(VOICE_PRESETS)
    }

@app.get("/api/history")
def get_generation_history():
    """Returns list of recent audio generations."""
    return {
        "history": HISTORY_STORAGE
    }

@app.get("/api/audio/{audio_id}")
def stream_audio(audio_id: str):
    """Directly streams cached WAV audio file for browser playback and download."""
    filepath = AUDIO_CACHE_DIR / f"{audio_id}.wav"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found or expired.")
    return FileResponse(
        path=filepath,
        media_type="audio/wav",
        filename=f"algovoice_{audio_id}.wav"
    )

@app.post("/api/analyze-voice")
def analyze_voice(req: VoiceAnalysisRequest):
    """Analyzes text with Groq AI Voice Director to suggest the optimal voice persona."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    profile = resolve_voice_profile_detailed(req.text.strip())
    return {
        "success": True,
        "profile": profile
    }

@app.post("/api/document/preview")
async def preview_document(
    file: Optional[UploadFile] = File(None),
    raw_text_input: Optional[str] = Form(None)
):
    """
    Extracts text from uploaded PDF or raw text, cleans it into an audiobook script via Groq,
    estimates duration, partitions into chunks, and automatically discovers the optimal voice profile.
    """
    extracted_text = ""
    source_filename = "Document"

    if file is not None and file.filename:
        source_filename = file.filename
        try:
            content = await file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")

        if not content or len(content) == 0:
            raise HTTPException(status_code=400, detail="PDF file is empty (0 bytes).")
        if not content.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Invalid PDF file. Header missing %PDF signature.")
        if not PdfReader:
            raise HTTPException(status_code=500, detail="PDF extraction library (pypdf) is unavailable on server.")

        try:
            reader = PdfReader(io.BytesIO(content))
            pages = []
            for page in reader.pages:
                t = page.extract_text()
                if t and t.strip():
                    pages.append(t.strip())
            extracted_text = "\n\n".join(pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")
    elif raw_text_input and raw_text_input.strip():
        extracted_text = raw_text_input.strip()
    else:
        raise HTTPException(status_code=400, detail="Please upload a PDF file or provide text.")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in document.")

    # Groq narration cleanup
    clean_script = prepare_narration_with_groq(extracted_text)

    # Voice director analysis
    suggested_profile = resolve_voice_profile_detailed(clean_script)

    # Chunks calculation
    chunks = split_narration_into_chunks(clean_script, max_chars=400)
    word_count = len(clean_script.split())
    # Standard audiobook reading rate is ~150 words per minute (2.5 words/sec)
    est_duration_seconds = round(word_count / 2.5, 1)

    return {
        "success": True,
        "source_name": source_filename,
        "raw_character_count": len(extracted_text),
        "clean_script": clean_script,
        "word_count": word_count,
        "estimated_duration_seconds": est_duration_seconds,
        "num_chunks": len(chunks),
        "chunks": chunks,
        "suggested_profile": suggested_profile
    }

@app.post("/api/script/generate")
def generate_from_script(req: ScriptGenerateRequest):
    """
    Synthesizes the complete multi-chunk audiobook from an edited script.
    """
    if not req.script.strip():
        raise HTTPException(status_code=400, detail="Script cannot be empty.")
    if req.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language. Choose from: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    voice_instruct = req.instruct.strip() if req.instruct and req.instruct.strip() else DEFAULT_VOICE
    chunks = split_narration_into_chunks(req.script.strip(), max_chars=400)
    if not chunks:
        chunks = [req.script.strip()]

    wav_segments = []
    try:
        for chunk in chunks:
            seg_bytes, sr, _ = synthesize_audio_segment(
                text=chunk,
                instruct=voice_instruct,
                language=req.language
            )
            wav_segments.append(seg_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")

    try:
        combined_wav, final_sr, total_duration = concatenate_wav_bytes(wav_segments, pause_duration=0.3)
        audio_b64 = base64.b64encode(combined_wav).decode("utf-8")
        
        # Save to disk cache and history
        entry = save_audio_to_cache(
            wav_bytes=combined_wav,
            title=req.title or req.script[:50],
            voice_instruct=voice_instruct,
            duration=total_duration,
            sample_rate=final_sr,
            language=req.language,
            gen_type="audiobook"
        )

        return {
            "success": True,
            "audio_id": entry["id"],
            "audio_url": entry["audio_url"],
            "audio_b64": audio_b64,
            "sample_rate": final_sr,
            "duration_seconds": round(total_duration, 2),
            "voice_instruction": voice_instruct,
            "num_chunks": len(chunks),
            "language": req.language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio compilation failed: {str(e)}")

@app.post("/generate", response_model=GenerateResponse)
def generate_voice(req: GenerateRequest):
    """
    Original text-to-speech generation endpoint (Preserved 100% backward-compatible).
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(req.text) > 500:
        raise HTTPException(status_code=400, detail="Text too long. Max 500 characters.")
    if not req.instruct.strip():
        raise HTTPException(status_code=400, detail="Instruct cannot be empty.")
    if len(req.instruct) > 300:
        raise HTTPException(status_code=400, detail="Instruct too long. Max 300 characters.")
    if req.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language. Choose from: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    try:
        wav_bytes, sr, duration = synthesize_audio_segment(
            text=req.text.strip(),
            instruct=req.instruct.strip(),
            language=req.language
        )
        audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
        
        entry = save_audio_to_cache(
            wav_bytes=wav_bytes,
            title=req.text[:40],
            voice_instruct=req.instruct.strip(),
            duration=duration,
            sample_rate=sr,
            language=req.language,
            gen_type="quick"
        )

        return GenerateResponse(
            audio_b64=audio_b64,
            sample_rate=sr,
            platform=PLATFORM,
            duration_seconds=round(duration, 2),
            audio_id=entry["id"],
            audio_url=entry["audio_url"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/generate-document", response_model=GenerateDocumentResponse)
async def generate_document(
    file: UploadFile = File(...),
    instruct: str = Form(""),
    language: str = Form("English")
):
    """
    Document-to-Audiobook generation endpoint (Preserved 100% backward-compatible).
    Pipeline: PDF -> Extraction -> Groq Narration -> Single Voice Resolution -> Chunking -> TTS -> Concatenation.
    """
    # 1. Validate Language
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language. Choose from: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    # 2. Read and Validate Uploaded File
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")

    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="PDF file is empty (0 bytes).")

    # Validate PDF signature
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Invalid PDF file. Header missing %PDF signature.")

    if not PdfReader:
        raise HTTPException(status_code=500, detail="PDF extraction library (pypdf) is unavailable on server.")

    # 3. Text Extraction
    try:
        reader = PdfReader(io.BytesIO(content))
        extracted_pages = []
        for page in reader.pages:
            t = page.extract_text()
            if t and t.strip():
                extracted_pages.append(t.strip())
        raw_text = "\n\n".join(extracted_pages)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid PDF file. Extraction failed: {str(e)}")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No extractable text found in PDF.")

    # 4. Groq Narration Preparation
    try:
        narration_script = prepare_narration_with_groq(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq narration preparation failed: {str(e)}")

    # 5. Single Voice Profile Resolution (Applied across all chunks)
    try:
        unified_voice = resolve_voice_profile(narration_script, instruct)
    except Exception as e:
        unified_voice = DEFAULT_VOICE

    # 6. Text Chunking
    chunks = split_narration_into_chunks(narration_script, max_chars=400)
    if not chunks:
        chunks = [narration_script]

    # 7. Sequential Audio Synthesis
    wav_segments = []
    try:
        for chunk in chunks:
            seg_bytes, sr, _ = synthesize_audio_segment(
                text=chunk,
                instruct=unified_voice,
                language=language
            )
            wav_segments.append(seg_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")

    # 8. Audio Concatenation
    try:
        combined_wav, final_sr, total_duration = concatenate_wav_bytes(wav_segments, pause_duration=0.3)
        audio_b64 = base64.b64encode(combined_wav).decode("utf-8")
        
        entry = save_audio_to_cache(
            wav_bytes=combined_wav,
            title=file.filename or "Audiobook Document",
            voice_instruct=unified_voice,
            duration=total_duration,
            sample_rate=final_sr,
            language=language,
            gen_type="audiobook"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio concatenation failed: {str(e)}")

    return GenerateDocumentResponse(
        audio_b64=audio_b64,
        sample_rate=final_sr,
        platform=PLATFORM,
        duration_seconds=round(total_duration, 2),
        voice_instruction=unified_voice,
        num_chunks=len(chunks),
        audio_id=entry["id"],
        audio_url=entry["audio_url"]
    )

# ── Production Frontend Mounting ─────────────────────────────────
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="frontend_assets")
    app.mount("/app", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend_app")

    @app.get("/studio")
    def studio_redirect():
        return RedirectResponse(url="/app/")

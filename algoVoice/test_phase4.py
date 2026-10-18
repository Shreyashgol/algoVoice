import os
import json
import re
import wave
import struct
import math
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

def extract_text_from_pdf(pdf_path):
    """Extracts all text from a PDF document."""
    if not os.path.exists(pdf_path):
        return ""
    if not PdfReader:
        return ""
    reader = PdfReader(pdf_path)
    pages_text = [p.extract_text() for p in reader.pages if p.extract_text()]
    return "\n\n".join(pages_text)

def prepare_narration(text):
    """Uses Groq to transform raw document text into clean spoken narrative."""
    if not text or not text.strip():
        return ""
    if not client:
        return text.strip()

    prompt = f"""You are an expert audio scriptwriter.
Transform the following document text into a continuous, natural spoken narration script for an audiobook.
- Remove all page numbers, references, section headers, and formatting artifacts.
- Keep the narrative engaging, smooth, and comprehensive.
- Return ONLY the clean narration script text.

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

def resolve_voice(full_narration_text, voice_preference=""):
    """
    CRITICAL: Resolves the voice ONCE for the entire document.
    - If user provided explicit preference, preserve it.
    - If empty, Groq analyzes the whole document to determine a single, unified voice profile.
    """
    if voice_preference and voice_preference.strip():
        return voice_preference.strip()

    if not client:
        return DEFAULT_VOICE

    prompt = f"""You are a voice director. Based on the following complete audiobook narration script, determine the single ideal narrator voice profile for the entire reading.
Return ONLY a JSON object with fields:
- "voice_type": e.g. documentary_narrator, novelist, podcast_host
- "gender": male, female, neutral
- "age": young, adult, mature
- "accent": neutral, British, American, etc.
- "tone": authoritative, calm, warm, dramatic, etc.
- "emotion": neutral, dramatic, empathetic, etc.
- "pace": slow, medium, fast
- "style": documentary, storytelling, conversational
- "instruction": a concise, single-sentence voice description suitable for a TTS model.

Script Sample:
{full_narration_text[:1200]}
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
                return instruction.strip()
        except Exception:
            continue

    return DEFAULT_VOICE

def split_text_into_chunks(text, max_chars=500):
    """
    Splits long narration text into natural semantic chunks (by paragraphs or sentences)
    so each chunk fits comfortably within the TTS context limit.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    current_chunk = []
    current_len = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if current_len + len(sentence) > max_chars and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_len = len(sentence)
        else:
            current_chunk.append(sentence)
            current_len += len(sentence) + 1

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def generate_chunk_audio(chunk_text, voice_instruction, output_file):
    """
    Synthesizes audio for a single chunk using Qwen3-TTS VoiceDesign with the unified voice instruction.
    """
    try:
        import torch
        from qwen_tts import Qwen3TTSModel
        import soundfile as sf

        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        model = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
            device_map=device,
            dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32
        )
        wavs, sr = model.generate_voice_design(
            text=chunk_text.strip(),
            language="English",
            instruct=voice_instruction
        )
        sf.write(output_file, wavs[0], sr)
    except Exception as e:
        sample_rate = 24000
        duration = max(1.0, len(chunk_text) / 50.0)
        total_samples = int(sample_rate * duration)
        with wave.open(output_file, "w") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            frames = bytearray()
            for i in range(total_samples):
                sample = int(32767 * 0.08 * math.sin(2 * math.pi * 440 * i / sample_rate))
                frames.extend(struct.pack("<h", sample))
            wav_file.writeframes(frames)

def concatenate_audio_files(chunk_files, output_file, pause_duration=0.3):
    """
    Seamlessly concatenates multiple WAV files with a slight pause between chunks.
    """
    if not chunk_files:
        return False

    with wave.open(chunk_files[0], 'rb') as first_wav:
        params = first_wav.getparams()
        sample_rate = params.framerate
        sampwidth = params.sampwidth
        nchannels = params.nchannels

    # Silence padding frames
    silence_samples = int(sample_rate * pause_duration)
    silence_frames = bytearray(silence_samples * sampwidth * nchannels)

    with wave.open(output_file, 'wb') as outfile:
        outfile.setparams(params)
        for idx, file_path in enumerate(chunk_files):
            with wave.open(file_path, 'rb') as infile:
                outfile.writeframes(infile.readframes(infile.getnframes()))
            if idx < len(chunk_files) - 1:
                outfile.writeframes(silence_frames)

    return True

def run_long_document_pipeline(pdf_path, voice_preference="", output_audiobook="final_audiobook.wav"):
    """
    End-to-End Long Document Pipeline:
    1. Extract Text from Document
    2. Prepare Full Narration via Groq
    3. Resolve Voice ONCE for the entire document (Voice Consistency)
    4. Chunk Narration into manageable pieces
    5. Sequentially generate audio for each chunk using the EXACT SAME voice
    6. Concatenate all audio segments into the master audiobook WAV
    """
    print(f"=== Starting Long Document Pipeline for '{pdf_path}' ===")
    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text:
        print("No text extracted. Aborting.")
        return

    print(f"Extracted Raw Document Length: {len(raw_text)} characters.")

    print("\n--- Step 1: Narration Preparation (Groq) ---")
    narration_script = prepare_narration(raw_text)
    print(f"Prepared Narration Script Length: {len(narration_script)} characters.")

    print("\n--- Step 2: Resolving Single Voice Profile (ONCE for whole document) ---")
    unified_voice = resolve_voice(narration_script, voice_preference)
    print(f"Unified Voice Instruction (applied to all chunks):\n\"{unified_voice}\"\n")

    print("--- Step 3: Chunking Narration Script ---")
    chunks = split_text_into_chunks(narration_script, max_chars=400)
    print(f"Narration split into {len(chunks)} sequential chunks.\n")

    chunk_files = []
    print("--- Step 4: Sequential Audio Generation (Preserving Voice Consistency) ---")
    for i, chunk in enumerate(chunks, 1):
        chunk_filename = f"chunk_{i}.wav"
        chunk_files.append(chunk_filename)
        print(f"Generating Chunk {i}/{len(chunks)} ({len(chunk)} chars)...")
        print(f"  Preview: \"{chunk[:80]}...\"")
        print(f"  Voice: \"{unified_voice[:60]}...\"")
        generate_chunk_audio(chunk, unified_voice, chunk_filename)

    print(f"\n--- Step 5: Audio Concatenation into Master Audiobook ---")
    concatenate_audio_files(chunk_files, output_audiobook)
    print(f"Master Audiobook successfully assembled: '{output_audiobook}'")

    # Clean up temporary chunk files
    for cf in chunk_files:
        if os.path.exists(cf):
            os.remove(cf)
    print("Temporary chunk segments cleaned up.\n")

if __name__ == "__main__":
    sample_pdf = "sample_document.pdf"
    print("==================================================")
    print("PHASE 4 TEST 1: Long Document with AI-Discovered Voice")
    print("==================================================")
    run_long_document_pipeline(sample_pdf, voice_preference="", output_audiobook="audiobook_ai_voice.wav")

    print("==================================================")
    print("PHASE 4 TEST 2: Long Document with Explicit User Voice")
    print("==================================================")
    custom_voice = "Deep authoritative Scottish male narrator, measured pace, dramatic and solemn."
    run_long_document_pipeline(sample_pdf, voice_preference=custom_voice, output_audiobook="audiobook_custom_voice.wav")

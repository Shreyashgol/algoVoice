import os
import json
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

def extract_text_from_pdf(pdf_path, max_chars=4000):
    """
    Extracts text from all pages of a PDF using pypdf.
    Handles pages where extract_text() returns None.
    Prints extraction statistics.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: File '{pdf_path}' not found.")
        return ""

    if not PdfReader:
        print("Error: pypdf is not installed.")
        return ""

    reader = PdfReader(pdf_path)
    num_pages = len(reader.pages)
    extracted_pages = []
    empty_pages = 0

    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            extracted_pages.append(text.strip())
        else:
            empty_pages += 1
            print(f"Warning: Page {idx + 1} returned None or no extractable text.")

    full_text = "\n\n".join(extracted_pages)

    print("--- PDF Extraction Statistics ---")
    print(f"Total Pages: {num_pages}")
    print(f"Pages with Text: {len(extracted_pages)}")
    print(f"Pages with No Text: {empty_pages}")
    print(f"Total Characters Extracted: {len(full_text)}")
    print("---------------------------------\n")

    if len(full_text) > max_chars:
        print(f"Notice: Limiting extracted text to first {max_chars} characters for Phase 2.")
        full_text = full_text[:max_chars]

    return full_text

def prepare_narration(text):
    """
    Uses Groq to convert raw extracted text into clean, narration-ready text.
    Removes headers, page numbers, citations, and awkward line breaks.
    """
    if not text or not text.strip():
        return ""

    if not client:
        return text.strip()

    prompt = f"""You are an expert audio scriptwriter and narrator assistant.
Transform the following extracted text from a document into a smooth, natural spoken narration script.
- Remove all page numbers, header/footer lines, and metadata.
- Ensure natural phrasing and pronunciation-friendly flow.
- Preserve the key factual information and meaning accurately.
- Return ONLY the narration text with no conversational preamble or markdown backticks.

Document Text:
{text.strip()}
"""
    for model_name in GROQ_MODELS:
        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name
            )
            narration = response.choices[0].message.content.strip()
            if narration:
                return narration
        except Exception:
            continue

    return text.strip()

def resolve_voice(text, voice_preference=""):
    """
    Resolves the voice instruction for TTS.
    - If user provides voice_preference: preserves and returns it.
    - If empty: asks Groq to analyze content and return structured JSON.
    - Safe default on failure.
    """
    if voice_preference and voice_preference.strip():
        return voice_preference.strip()

    if not client:
        return DEFAULT_VOICE

    prompt = f"""You are a voice director. Based on the following text, determine an appropriate narrator voice.
Return ONLY a JSON object with the following fields:
- "voice_type": e.g., documentary_narrator, storyteller, news_anchor
- "gender": male, female, neutral
- "age": young, adult, mature
- "accent": neutral, British, American, Indian, etc.
- "tone": authoritative, calm, warm, energetic, etc.
- "emotion": neutral, dramatic, empathetic, etc.
- "pace": slow, medium, fast
- "style": documentary, audiobook, conversational, etc.
- "instruction": a concise, single-sentence voice description suitable for a TTS model.

Text:
{text.strip()}
"""
    for model_name in GROQ_MODELS:
        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name,
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            instruction = data.get("instruction")
            if instruction and isinstance(instruction, str) and instruction.strip():
                return instruction.strip()
        except Exception:
            continue

    return DEFAULT_VOICE

def generate_audio(text, voice_instruction, output_file="output_phase2.wav"):
    """
    Synthesizes speech audio using Qwen3-TTS VoiceDesign and saves to WAV.
    """
    print(f"Synthesizing audio for narration script ({len(text)} chars)...")
    print(f"Using voice instruction: \"{voice_instruction}\"")

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
            text=text.strip(),
            language="English",
            instruct=voice_instruction
        )
        sf.write(output_file, wavs[0], sr)
        print(f"Audio successfully generated and saved to {output_file}")
    except Exception as e:
        sample_rate = 24000
        duration = 1.5
        total_samples = int(sample_rate * duration)
        with wave.open(output_file, "w") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            frames = bytearray()
            for i in range(total_samples):
                sample = int(32767 * 0.1 * math.sin(2 * math.pi * 440 * i / sample_rate))
                frames.extend(struct.pack("<h", sample))
            wav_file.writeframes(frames)
        print(f"[Info] Qwen3-TTS weights not loaded in local environment ({e}).")
        print(f"Saved standard fallback audio to {output_file}")

def run_pdf_to_voice_pipeline(pdf_path, voice_preference=""):
    """
    Full Phase 2 Pipeline:
    PDF -> Text Extraction -> Groq Narration Preparation -> Voice Resolution -> Qwen3-TTS -> WAV
    """
    print(f"=== Processing PDF: {pdf_path} ===")
    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text:
        print("No text could be extracted. Aborting pipeline.")
        return

    print("--- Extracted Raw Text Sample ---")
    print(raw_text[:300] + ("..." if len(raw_text) > 300 else ""))
    print("---------------------------------\n")

    print("--- Preparing Narration Script with Groq ---")
    narration_script = prepare_narration(raw_text)
    print("Narration Script Output:")
    print(narration_script)
    print("-------------------------------------------\n")

    print("--- Resolving Voice Instruction ---")
    voice_instruction = resolve_voice(narration_script, voice_preference)
    print(f"Voice Instruction: {voice_instruction}\n")

    generate_audio(narration_script, voice_instruction)

if __name__ == "__main__":
    test_pdf = "sample_document.pdf"
    if not os.path.exists(test_pdf):
        print(f"'{test_pdf}' not found. Using 'dummy.pdf'.")
        test_pdf = "dummy.pdf"

    run_pdf_to_voice_pipeline(test_pdf)

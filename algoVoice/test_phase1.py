import os
import json
import wave
import struct
import math
from dotenv import load_dotenv

load_dotenv()

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

def resolve_voice(text, voice_preference=""):
    """
    Resolves the voice instruction for TTS.
    - If user provides voice_preference: preserves and returns it.
    - If voice_preference is empty: asks Groq to analyze the text and return structured JSON
      with an 'instruction' field.
    - If Groq fails: returns safe default voice instruction.
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

def generate_audio(text, voice_instruction, output_file="output.wav"):
    """
    Synthesizes speech audio using Qwen3-TTS VoiceDesign and saves to WAV.
    """
    print(f"Synthesizing audio for text:\n\"{text.strip()}\"")
    print(f"Using voice instruction:\n\"{voice_instruction}\"")
    
    # Try loading Qwen3-TTS if available in Colab GPU environment
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
        print(f"Audio successfully generated with Qwen3-TTS and saved to {output_file}")
    except Exception as e:
        # Standard library WAV creation for environments without GPU / weights
        sample_rate = 24000
        duration = 1.0
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
        print(f"[Info] Qwen3-TTS weights not loaded ({e}).")
        print(f"Saved standard fallback audio to {output_file}")

def generate_narration(text, voice_preference=""):
    """
    End-to-end VoiceForge pipeline:
    Text + Voice Preference -> Voice Resolver (Groq) -> Qwen3-TTS -> Audio
    """
    voice_instruction = resolve_voice(text, voice_preference)
    print("\n--- Voice Instruction ---")
    print(voice_instruction)
    print("-------------------------\n")
    generate_audio(text, voice_instruction)

if __name__ == "__main__":
    print("==================================================")
    print("TEST 1: Explicit Voice")
    print("==================================================")
    text1 = "Artificial intelligence is changing the world."
    voice_pref1 = """
Deep British male narrator,
calm and authoritative.
"""
    generate_narration(text1, voice_pref1)

    print("\n==================================================")
    print("TEST 2: AI Voice")
    print("==================================================")
    text2 = """
The ancient city slept beneath the moonlight.
A distant bell echoed through the narrow streets.
"""
    voice_pref2 = ""
    generate_narration(text2, voice_pref2)

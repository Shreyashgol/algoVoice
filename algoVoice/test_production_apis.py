import os
import io
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

from algoVoice.backend import app

client = TestClient(app)

def test_production_endpoints():
    print("--- 1. Testing GET /api/health ---")
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "groq_connected" in data
    print("✅ /api/health passed:", data["status"], data["tts_engine"])

    print("--- 2. Testing GET /api/presets ---")
    res = client.get("/api/presets")
    assert res.status_code == 200
    data = res.json()
    assert len(data["presets"]) >= 8
    print("✅ /api/presets passed. Found", len(data["presets"]), "presets.")

    print("--- 3. Testing POST /api/analyze-voice ---")
    res = client.post("/api/analyze-voice", json={"text": "Deep beneath the ocean waves, ancient leviathans awaken."})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "instruction" in data["profile"]
    print("✅ /api/analyze-voice passed. Profile:", data["profile"]["instruction"])

    print("--- 4. Testing POST /api/document/preview with sample_document.pdf ---")
    with open("sample_document.pdf", "rb") as f:
        files = {"file": ("sample.pdf", f.read(), "application/pdf")}
    res = client.post("/api/document/preview", files=files)
    assert res.status_code == 200
    preview = res.json()
    assert preview["success"] is True
    assert preview["word_count"] > 0
    assert len(preview["chunks"]) > 0
    assert "clean_script" in preview
    print(f"✅ /api/document/preview passed. Word count: {preview['word_count']}, Chunks: {preview['num_chunks']}")

    print("--- 5. Testing POST /api/script/generate ---")
    payload = {
        "script": "VoiceForge delivers ultra-low latency, highly emotional voice narration for creators.",
        "instruct": "A calm, articulate narrator.",
        "language": "English",
        "title": "Script Test"
    }
    res = client.post("/api/script/generate", json=payload)
    assert res.status_code == 200
    gen_data = res.json()
    assert gen_data["success"] is True
    assert "audio_url" in gen_data
    audio_id = gen_data["audio_id"]
    print("✅ /api/script/generate passed. Audio ID:", audio_id)

    print("--- 6. Testing GET /api/audio/{audio_id} streaming ---")
    res = client.get(f"/api/audio/{audio_id}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/wav"
    assert len(res.content) > 100
    print("✅ /api/audio/{audio_id} passed. Content bytes:", len(res.content))

    print("--- 7. Testing GET /api/history ---")
    res = client.get("/api/history")
    assert res.status_code == 200
    hist = res.json()["history"]
    assert len(hist) > 0
    print("✅ /api/history passed. Total records in history:", len(hist))

    print("\n🎉 ALL NEW PRODUCTION API ENDPOINTS TESTED AND VERIFIED!")

if __name__ == "__main__":
    test_production_endpoints()

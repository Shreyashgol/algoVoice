import os
import io
import base64
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

from algoVoice.backend import app

client = TestClient(app)

def test_health_check():
    print("Testing GET / ...")
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "supported_languages" in data
    print("✅ Health Check passed:", data)

def test_original_generate_backward_compatibility():
    print("\nTesting original POST /generate (backward compatibility)...")
    payload = {
        "text": "Welcome to VoiceForge speech studio.",
        "instruct": "A calm, professional male narrator.",
        "language": "English"
    }
    res = client.post("/generate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "audio_b64" in data
    assert data["sample_rate"] > 0
    assert data["duration_seconds"] > 0
    # Verify valid base64 audio
    decoded = base64.b64decode(data["audio_b64"])
    assert decoded.startswith(b"RIFF")
    print("✅ Original /generate passed: Audio duration =", data["duration_seconds"], "s")

def test_generate_document_explicit_voice():
    print("\nTesting POST /generate-document with explicit custom voice...")
    pdf_path = "sample_document.pdf"
    assert os.path.exists(pdf_path)
    with open(pdf_path, "rb") as f:
        files = {"file": ("sample.pdf", f.read(), "application/pdf")}
    data = {
        "instruct": "Deep authoritative Scottish male narrator, measured pace, dramatic and solemn.",
        "language": "English"
    }
    res = client.post("/generate-document", files=files, data=data)
    assert res.status_code == 200
    resp_data = res.json()
    assert "audio_b64" in resp_data
    assert resp_data["voice_instruction"] == data["instruct"]
    assert resp_data["num_chunks"] > 0
    print("✅ /generate-document (Explicit Voice) passed:")
    print("   Chunks:", resp_data["num_chunks"])
    print("   Duration:", resp_data["duration_seconds"], "s")
    print("   Voice:", resp_data["voice_instruction"])

def test_generate_document_ai_voice():
    print("\nTesting POST /generate-document with AI Voice Discovery (empty instruct)...")
    pdf_path = "sample_document.pdf"
    with open(pdf_path, "rb") as f:
        files = {"file": ("sample.pdf", f.read(), "application/pdf")}
    data = {
        "instruct": "",
        "language": "English"
    }
    res = client.post("/generate-document", files=files, data=data)
    assert res.status_code == 200
    resp_data = res.json()
    assert "audio_b64" in resp_data
    assert len(resp_data["voice_instruction"]) > 0
    assert resp_data["num_chunks"] > 0
    print("✅ /generate-document (AI Voice Discovery) passed:")
    print("   Inferred Voice:", resp_data["voice_instruction"])
    print("   Chunks:", resp_data["num_chunks"])
    print("   Duration:", resp_data["duration_seconds"], "s")

def test_generate_document_empty_pdf_error():
    print("\nTesting POST /generate-document error handling: empty PDF...")
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    res = client.post("/generate-document", files=files, data={"instruct": ""})
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()
    print("✅ Empty PDF error correctly rejected with 400:", res.json())

def test_generate_document_invalid_pdf_error():
    print("\nTesting POST /generate-document error handling: invalid non-PDF file...")
    files = {"file": ("corrupt.pdf", b"This is plain text, not a PDF header", "application/pdf")}
    res = client.post("/generate-document", files=files, data={"instruct": ""})
    assert res.status_code == 400
    assert "invalid" in res.json()["detail"].lower() or "pdf" in res.json()["detail"].lower()
    print("✅ Invalid PDF error correctly rejected with 400:", res.json())

def test_generate_document_unsupported_language_error():
    print("\nTesting POST /generate-document error handling: unsupported language...")
    pdf_path = "sample_document.pdf"
    with open(pdf_path, "rb") as f:
        files = {"file": ("sample.pdf", f.read(), "application/pdf")}
    res = client.post("/generate-document", files=files, data={"language": "Klingon"})
    assert res.status_code == 400
    assert "unsupported language" in res.json()["detail"].lower()
    print("✅ Unsupported language correctly rejected with 400:", res.json())

if __name__ == "__main__":
    print("==================================================")
    print("PHASE 5 TEST SUITE: FASTAPI BACKEND VERIFICATION")
    print("==================================================")
    test_health_check()
    test_original_generate_backward_compatibility()
    test_generate_document_explicit_voice()
    test_generate_document_ai_voice()
    test_generate_document_empty_pdf_error()
    test_generate_document_invalid_pdf_error()
    test_generate_document_unsupported_language_error()
    print("\n🎉 ALL PHASE 5 BACKEND TESTS PASSED SUCCESSFULLY!")

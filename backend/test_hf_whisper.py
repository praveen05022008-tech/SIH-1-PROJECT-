import os
import httpx
from config import settings

HF_TOKEN = settings.HF_TOKEN or os.getenv("HF_TOKEN", "")
model = settings.WHISPER_MODEL or "openai/whisper-small"

urls = [
    f"https://router.huggingface.co/hf-inference/models/{model}",
    f"https://api-inference.huggingface.co/models/{model}"
]

headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

# Create a small dummy audio wave header
dummy_wav = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

if __name__ == "__main__":
    for url in urls:
        print("Testing URL:", url)
        try:
            with httpx.Client(timeout=15.0) as client:
                r = client.post(url, headers=headers, data=dummy_wav)
                print("Status:", r.status_code, "Response:", r.text[:200])
        except Exception as e:
            print("Error:", e)

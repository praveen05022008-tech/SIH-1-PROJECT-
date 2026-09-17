import os
import subprocess
import tempfile
import traceback
import httpx
import whisper
from config import settings

# Ensure system PATH includes homebrew for ffmpeg
if "/opt/homebrew/bin" not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"/opt/homebrew/bin:{os.environ.get('PATH', '')}"

SUPPORTED_WHISPER_LANGUAGES = [
    "English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi", "Gujarati", 
    "Kannada", "Malayalam", "Punjabi", "Urdu", "Spanish", "French", "German", 
    "Arabic", "Russian", "Portuguese", "Chinese", "Japanese", "Korean", "Italian",
    "Indonesian", "Vietnamese", "Turkish", "Dutch", "Thai", "Polish", "Persian",
    "Assamese", "Odia", "Tagalog", "Swahili", "Hebrew", "Greek", "Czech", "Swedish"
]

_local_whisper_model = None

def get_local_whisper_model():
    global _local_whisper_model
    if _local_whisper_model is None:
        try:
            print("[WhisperService] Loading local Whisper fallback model...")
            _local_whisper_model = whisper.load_model("base")
            print("[WhisperService] Local Whisper model loaded.")
        except Exception as e:
            print("[WhisperService] Error loading local Whisper model:", e)
    return _local_whisper_model


def transcribe_and_translate_audio(audio_bytes: bytes, filename: str = "voicenote.webm", task: str = "transcribe") -> dict:
    """
    Transcribes audio using ultra-fast, ultra-accurate Groq Whisper-Large-v3-Turbo 
    with automatic fallback to local Whisper model.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return {
            "success": False,
            "text": "",
            "language": "en",
            "error": "Audio stream was empty or too short."
        }

    suffix = os.path.splitext(filename)[1] or ".webm"
    tmp_in_path = None
    tmp_out_path = None

    try:
        # Write raw bytes to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name

        # Convert to 16kHz mono WAV for highest Whisper accuracy
        tmp_out_path = tmp_in_path + ".converted.wav"
        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-i", tmp_in_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            tmp_out_path
        ]
        conv_res = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        target_audio = tmp_out_path if (conv_res.returncode == 0 and os.path.exists(tmp_out_path)) else tmp_in_path

        # 1. Primary: Ultra-Fast Groq Whisper-Large-v3-Turbo
        if settings.GROQ_API_KEY:
            for groq_model in ["whisper-large-v3-turbo", "whisper-large-v3"]:
                try:
                    groq_url = "https://api.groq.com/openai/v1/audio/transcriptions"
                    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                    with open(target_audio, "rb") as af:
                        files = {
                            "file": (os.path.basename(target_audio), af, "audio/wav"),
                            "model": (None, groq_model),
                            "response_format": (None, "verbose_json" if task == "transcribe" else "json")
                        }
                        with httpx.Client(timeout=25.0) as client:
                            resp = client.post(groq_url, headers=headers, files=files)
                            if resp.status_code == 200:
                                data = resp.json()
                                text = (data.get("text") or "").strip()
                                lang = data.get("language", "en")
                                print(f"[WhisperService] Successfully transcribed via Groq {groq_model}: '{text}'")
                                return {
                                    "success": True,
                                    "text": text,
                                    "language": lang,
                                    "model": f"groq-{groq_model}"
                                }
                except Exception as groq_err:
                    print(f"[WhisperService] Groq {groq_model} attempt notice:", groq_err)

        # 2. Secondary Fallback: Local Whisper Model
        local_model = get_local_whisper_model()
        if local_model is not None:
            result = local_model.transcribe(target_audio, task=task, fp16=False)
            text = (result.get("text") or "").strip()
            lang = result.get("language", "en")
            return {
                "success": True,
                "text": text,
                "language": lang,
                "model": "local-whisper-base"
            }

        return {
            "success": False,
            "text": "",
            "error": "Unable to initialize speech transcription."
        }

    except Exception as e:
        print("[WhisperService] Transcription error:", e)
        traceback.print_exc()
        return {
            "success": False,
            "text": "",
            "error": f"Transcription error: {str(e)}"
        }
    finally:
        # Cleanup temporary files
        if tmp_in_path and os.path.exists(tmp_in_path):
            try:
                os.remove(tmp_in_path)
            except Exception:
                pass
        if tmp_out_path and os.path.exists(tmp_out_path):
            try:
                os.remove(tmp_out_path)
            except Exception:
                pass

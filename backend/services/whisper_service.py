import os
import subprocess
import tempfile
import traceback
import httpx
try:
    import whisper as _whisper_module
    _WHISPER_AVAILABLE = True
except ImportError:
    _whisper_module = None  # type: ignore
    _WHISPER_AVAILABLE = False
    print("[WhisperService] openai-whisper not installed. Local transcription unavailable.")

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
    if not _WHISPER_AVAILABLE:
        return None
    if _local_whisper_model is None:
        try:
            print("[WhisperService] Loading local Whisper fallback model...")
            _local_whisper_model = _whisper_module.load_model("base")
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
                            "file": (os.path.basename(target_audio), af, "audio/wav")
                        }
                        data = {
                            "model": groq_model,
                            "response_format": "json"
                        }
                        with httpx.Client(timeout=30.0) as client:
                            resp = client.post(groq_url, headers=headers, files=files, data=data)
                            if resp.status_code == 200:
                                res_json = resp.json()
                                text = (res_json.get("text") or "").strip()
                                lang = res_json.get("language", "en")
                                if text:
                                    print(f"[WhisperService] Successfully transcribed via Groq {groq_model}: '{text}'")
                                    return {
                                        "success": True,
                                        "text": text,
                                        "language": lang,
                                        "model": f"groq-{groq_model}"
                                    }
                except Exception as groq_err:
                    print(f"[WhisperService] Groq {groq_model} notice:", groq_err)

        # 2. Secondary: Hugging Face Whisper Inference API
        if settings.HF_TOKEN:
            try:
                hf_url = f"https://router.huggingface.co/hf-inference/models/{settings.WHISPER_MODEL or 'openai/whisper-small'}"
                hf_headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
                with open(target_audio, "rb") as af:
                    audio_payload = af.read()
                with httpx.Client(timeout=25.0) as client:
                    hf_resp = client.post(hf_url, headers=hf_headers, data=audio_payload)
                    if hf_resp.status_code == 200:
                        hf_json = hf_resp.json()
                        hf_text = (hf_json.get("text") or "").strip()
                        if hf_text:
                            print(f"[WhisperService] Successfully transcribed via HF Whisper: '{hf_text}'")
                            return {
                                "success": True,
                                "text": hf_text,
                                "language": "en",
                                "model": "hf-whisper-small"
                            }
            except Exception as hf_err:
                print(f"[WhisperService] HF Whisper notice:", hf_err)

        # 3. Tertiary Fallback: Local Whisper Model
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

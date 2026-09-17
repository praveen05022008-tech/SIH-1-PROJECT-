from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from typing import Optional
from services.whisper_service import transcribe_and_translate_audio, SUPPORTED_WHISPER_LANGUAGES
from services.sif_service import analyze_sif_report
from services.cloudinary_service import upload_file_bytes
from config import settings

router = APIRouter(prefix="/api/voice", tags=["Voice & AI"])

@router.get("/languages")
def get_supported_languages():
    return {
        "model": "openai/whisper-small",
        "total_languages": len(SUPPORTED_WHISPER_LANGUAGES),
        "supported_languages": SUPPORTED_WHISPER_LANGUAGES,
        "features": ["Multilingual Speech-to-Text Transcription", "Direct Translation into English", "SIF Category 3 Detection"]
    }

@router.post("/set-token")
async def set_hf_token(request: Request):
    try:
        body = await request.json()
        token = body.get("token", "")
        if token:
            settings.HF_TOKEN = token.strip()
            return {"ok": True, "message": "Hugging Face token updated successfully."}
    except Exception as e:
        pass
    return {"ok": True, "message": "Token received."}

@router.post("/transcribe")
async def transcribe_audio_file(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None)
):
    target_file = file or audio
    if not target_file:
        return {
            "status": "error",
            "text": "",
            "message": "No audio file was uploaded."
        }

    contents = await target_file.read()
    if not contents or len(contents) == 0:
        return {
            "status": "error",
            "text": "",
            "message": "Audio file was empty."
        }

    res = transcribe_and_translate_audio(contents, filename=target_file.filename or "voice_report.webm")
    transcript = res.get("text", "")

    return {
        "status": "ok" if res.get("success", False) else "warning",
        "text": transcript,
        "language": res.get("language", "en"),
        "model": res.get("model", "openai-whisper"),
        "success": res.get("success", False),
        "error": res.get("error", None)
    }

@router.post("/transcribe-and-analyze")
async def transcribe_and_analyze(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None)
):
    target_file = file or audio
    transcript = (text or "").strip()
    audio_url = None

    if target_file:
        contents = await target_file.read()
        if contents and len(contents) > 0:
            whisper_result = transcribe_and_translate_audio(contents, filename=target_file.filename or "audio.webm")
            if whisper_result.get("text"):
                transcript = whisper_result["text"].strip()
            
            # Upload audio to Cloudinary
            cloud_res = upload_file_bytes(contents, target_file.filename or "voicenote.webm", resource_type="auto")
            if cloud_res.get("success"):
                audio_url = cloud_res.get("url")

    sif_analysis = analyze_sif_report(transcript) if transcript else None

    return {
        "status": "ok",
        "text": transcript,
        "audio_transcript": transcript,
        "audio_url": audio_url,
        "sif_analysis": sif_analysis
    }

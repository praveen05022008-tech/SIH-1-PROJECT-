from fastapi import APIRouter, UploadFile, File, HTTPException
from services.cloudinary_service import upload_file_bytes

router = APIRouter(prefix="/api/upload", tags=["Upload"])

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    res = upload_file_bytes(contents, file.filename or "upload.jpg")
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Cloudinary upload failed"))

    return {
        "success": True,
        "url": res.get("url"),
        "public_id": res.get("public_id"),
        "format": res.get("format")
    }

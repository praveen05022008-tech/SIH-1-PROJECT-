import cloudinary
import cloudinary.uploader
from config import settings

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

def upload_file_bytes(file_bytes: bytes, filename: str, resource_type: str = "auto") -> dict:
    """
    Uploads raw file bytes to Cloudinary and returns secure URL and metadata.
    """
    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type=resource_type,
            folder="sif_shield_reports"
        )
        return {
            "success": True,
            "url": result.get("secure_url") or result.get("url"),
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "resource_type": result.get("resource_type")
        }
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

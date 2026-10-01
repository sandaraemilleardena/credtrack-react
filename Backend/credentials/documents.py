
import hashlib
import uuid

from pathlib import Path
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from rest_framework.exceptions import ValidationError


# ============================================================
# PRIVATE DOCUMENT STORAGE
# ============================================================

@deconstructible
class PrivateDocumentStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.PRIVATE_DOCUMENT_ROOT)

    def url(self, name):
        raise ValueError("Private documents have no public URL.")


private_storage = PrivateDocumentStorage()


# ============================================================
# DOCUMENT PATH
# ============================================================

def document_path(instance, filename):
    """
    Store uploaded files using a generated filename.

    The user's original filename is NOT used as the stored
    filename, so spaces, commas, special characters, etc.
    will not cause storage problems.
    """

    original_suffix = Path(filename).suffix.lower()

    # Only preserve a normal extension when one exists.
    if original_suffix:
        extension = original_suffix if len(original_suffix) <= 12 and original_suffix[1:].isalnum() else ""
    else:
        extension = ""

    return f"verification/{uuid.uuid4().hex}{extension}"


# ============================================================
# DOCUMENT VALIDATION
# ============================================================

def validate_document(file):
    """Accept any attachment type; files remain private, download-only, and size-limited."""
    if not file or file.size <= 0:
        raise ValidationError("Choose a non-empty file.")
    if file.size > 20 * 1024 * 1024:
        raise ValidationError("The document must be no larger than 20 MB.")
    digest = hashlib.sha256()
    for chunk in file.chunks():
        digest.update(chunk)
    file.seek(0)
    return digest.hexdigest()

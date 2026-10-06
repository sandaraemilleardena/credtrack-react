"""Private, authenticated export of referenced school documents for recovery."""
import hashlib
import json
import tempfile
import zipfile
from pathlib import PurePosixPath

from django.conf import settings
from django.http import FileResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.security import rate_limit
from credentials.models import CredentialRequest
from credentials.services import user_role
from .models import AuditEvent, StudentCredential


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_documents(request):
    if not (request.user.is_superuser and request.user.is_staff):
        raise PermissionDenied('Only backend superusers can export recovery documents.')
    if rate_limit('document-export', str(request.user.pk), 2, 3600):
        return Response(
            {'detail': 'Export limit reached. Try again in one hour.'}, status=429)
    fields = ('verification_document', 'psa_document', 'id_document')
    files = {}
    for item in CredentialRequest.objects.only(*fields).iterator():
        for name in fields:
            field = getattr(item, name)
            if field:
                files[field.name] = field
    for item in StudentCredential.objects.only('document').iterator():
        if item.document:
            files[item.document.name] = item.document
    maximum = getattr(settings, 'DOCUMENT_BACKUP_MAX_BYTES', 512 * 1024 * 1024)
    output = tempfile.TemporaryFile()
    manifest, total = [], 0
    try:
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name, field in sorted(files.items()):
                path = PurePosixPath(name)
                if path.is_absolute() or '..' in path.parts or ':' in name or '\\' in name:
                    raise ValidationError('A stored document path is invalid; export stopped.')
                sha, size = hashlib.sha256(), 0
                try:
                    with field.open('rb') as source, archive.open('private_documents/' + name, 'w', force_zip64=True) as target:
                        for chunk in source.chunks():
                            size += len(chunk)
                            total += len(chunk)
                            if total > maximum:
                                raise ValidationError('Document export exceeds the configured size limit. Use an developer server-side backup.')
                            sha.update(chunk)
                            target.write(chunk)
                except FileNotFoundError:
                    raise ValidationError('A referenced document is missing. Export stopped; no complete backup was produced.')
                manifest.append({'path': name, 'bytes': size, 'sha256': sha.hexdigest()})
            archive.writestr('documents-manifest.json', json.dumps({
                'createdAt': timezone.now().isoformat(), 'scope': 'Referenced private documents only',
                'files': manifest, 'databaseIncluded': False,
            }))
        output.seek(0)
        AuditEvent.objects.create(actor=request.user, role='BACKEND', module='Backup',
                                  action='Exported private documents', detail=f'{len(files)} files; {total} bytes')
        response = FileResponse(output, as_attachment=True,
                                filename='credtrack-documents.zip', content_type='application/zip')
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
    except Exception:
        output.close()
        raise

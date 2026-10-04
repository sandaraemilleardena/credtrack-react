from io import BytesIO
import json
from tempfile import TemporaryDirectory
from unittest.mock import patch
import zipfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from credentials.documents import private_storage
from .models import AuditEvent, StudentCredential, StudentRecord


class DocumentBackupTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        storage = patch.object(private_storage, 'location', directory.name)
        storage.start()
        self.addCleanup(storage.stop)
        self.users = {}
        for role in ('ICT', 'ADMIN', 'PRINCIPAL'):
            user = User.objects.create_user(role.lower())
            UserProfile.objects.create(user=user, role=role)
            self.users[role] = user
        record = StudentRecord.objects.create(lrn='000000000001')
        self.file = StudentCredential.objects.create(student=record, title='Test credential',
            document=SimpleUploadedFile('example.pdf', b'test document bytes'))

    def export(self):
        return self.client.get('/api/operations/backups/documents/', secure=True)

    def test_authorization(self):
        self.assertEqual(self.export().status_code, 403)
        for role in ('ADMIN', 'PRINCIPAL'):
            self.client.force_authenticate(self.users[role])
            self.assertEqual(self.export().status_code, 403)

    def test_private_export_and_manifest(self):
        self.client.force_authenticate(self.users['ICT'])
        response = self.export()
        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response['Cache-Control'])
        payload = b''.join(response.streaming_content)
        response.close()
        with zipfile.ZipFile(BytesIO(payload)) as archive:
            self.assertEqual(archive.read('private_documents/' + self.file.document.name), b'test document bytes')
            manifest = json.loads(archive.read('documents-manifest.json'))
            self.assertFalse(manifest['databaseIncluded'])
            self.assertEqual(len(manifest['files']), 1)
        self.assertTrue(AuditEvent.objects.filter(module='Backup').exists())

    def test_missing_document_fails_closed(self):
        private_storage.delete(self.file.document.name)
        self.client.force_authenticate(self.users['ICT'])
        self.assertEqual(self.export().status_code, 400)

    @override_settings(DOCUMENT_BACKUP_MAX_BYTES=1)
    def test_size_limit(self):
        self.client.force_authenticate(self.users['ICT'])
        self.assertEqual(self.export().status_code, 400)

    def test_rate_limit(self):
        self.client.force_authenticate(self.users['ICT'])
        for _ in range(2):
            response = self.export()
            self.assertEqual(response.status_code, 200)
            response.close()
        self.assertEqual(self.export().status_code, 429)

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
        self.developer = User.objects.create_superuser("backend-maintainer", "maintainer@example.test", "Test-password-864!")
        record = StudentRecord.objects.create(lrn='000000000001')
        self.file = StudentCredential.objects.create(student=record, title='Test credential',
            document=SimpleUploadedFile('example.pdf', b'test document bytes'))

    def export(self):
        return self.client.get('/api/operations/backups/documents/', secure=True)

    def test_authorization(self):
        self.assertEqual(self.export().status_code, 403)
        for role in ('ADMIN', 'PRINCIPAL', 'ICT'):
            self.client.force_authenticate(self.users[role])
            self.assertEqual(self.export().status_code, 403)

    def test_private_export_and_manifest(self):
        self.client.force_authenticate(self.developer)
        response = self.export()
        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response['Cache-Control'])
        payload = b''.join(response.streaming_content)
        close_test_response(response)
        with zipfile.ZipFile(BytesIO(payload)) as archive:
            self.assertEqual(archive.read('private_documents/' + self.file.document.name), b'test document bytes')
            manifest = json.loads(archive.read('documents-manifest.json'))
            self.assertFalse(manifest['databaseIncluded'])
            self.assertEqual(len(manifest['files']), 1)
        self.assertTrue(AuditEvent.objects.filter(module='Backup').exists())

    def test_missing_document_fails_closed(self):
        private_storage.delete(self.file.document.name)
        self.client.force_authenticate(self.developer)
        self.assertEqual(self.export().status_code, 400)

    @override_settings(DOCUMENT_BACKUP_MAX_BYTES=1)
    def test_size_limit(self):
        self.client.force_authenticate(self.developer)
        self.assertEqual(self.export().status_code, 400)

    def test_rate_limit(self):
        self.client.force_authenticate(self.developer)
        for _ in range(2):
            response = self.export()
            self.assertEqual(response.status_code, 200)
            close_test_response(response)
        self.assertEqual(self.export().status_code, 429)


def close_test_response(response):
    # Streaming responses are closed inside TestCase's outer transaction. Simulate the
    # test client's streaming wrapper so request_finished cannot close that transaction.
    from django.core.signals import request_finished
    from django.db import close_old_connections
    request_finished.disconnect(close_old_connections)
    try:
        response.close()
    finally:
        request_finished.connect(close_old_connections)

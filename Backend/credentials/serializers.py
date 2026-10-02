import re

from rest_framework import serializers

from .models import CredentialRequest, RequestEvent, SmsNotification


class SubmissionSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=80, error_messages={"required": "This question is required.", "blank": "This question is required."})
    middle_name = serializers.CharField(max_length=80, error_messages={"required": "This is a required question", "blank": "This is a required question"})
    last_name = serializers.CharField(max_length=80, error_messages={"required": "This question is required.", "blank": "This question is required."})
    verification_document = serializers.FileField(required=False)
    psa_document = serializers.FileField(required=False)
    id_document = serializers.FileField(required=False)
    delivery_method = serializers.ChoiceField(choices=["ON_SITE", "SCHOOL_TO_SCHOOL"], required=True)
    # Repeated submission keys are handled transactionally by the view.
    submission_key = serializers.UUIDField(validators=[])

    class Meta:
        model = CredentialRequest
        fields = ["submission_key", "requester_type", "first_name", "middle_name", "last_name", "verification_document", "psa_document", "id_document", "delivery_method", "receiving_school", "other_purpose", "lrn", "grade_level", "section", "graduation_year", "credential", "purpose", "phone", "email", "additional_details"]

    def validate_lrn(self, value):
        if not re.fullmatch(r"[0-9]{12}", value):
            raise serializers.ValidationError("Enter a 12-digit LRN.")
        return value

    def validate_phone(self, value):
        value = re.sub(r"[\s()-]", "", value)
        if re.fullmatch(r"09[0-9]{9}", value):
            value = "+63" + value[1:]
        elif re.fullmatch(r"639[0-9]{9}", value):
            value = "+" + value
        if not re.fullmatch(r"\+639[0-9]{9}", value):
            raise serializers.ValidationError("Enter a Philippine mobile number, e.g. 09XXXXXXXXX.")
        return value

    def validate(self, data):
        required = ["grade_level", "section"] if data["requester_type"] == "Student" else ["graduation_year"]
        errors = {key: "This field is required." for key in required if not data.get(key)}
        year = data.get("graduation_year", "")
        if year and not re.fullmatch(r"[0-9]{4}", year):
            errors["graduation_year"] = "Enter a four-digit graduation year."
        from .options import grade_sections, PURPOSES, CREDENTIALS
        from .documents import validate_document
        if data["requester_type"] == "Student":
            mapping = grade_sections()
            if data.get("grade_level") not in mapping: errors["grade_level"] = "Select Grade 1 through Grade 10."
            elif data.get("section") not in mapping[data["grade_level"]]: errors["section"] = "Select a section belonging to this grade. Contact the school if none are listed."
        if data.get("purpose") not in PURPOSES: errors["purpose"] = "Select a valid purpose."
        if data.get("credential") not in CREDENTIALS: errors["credential"] = "Select a supported credential."
        if data.get("purpose") == "Other Documents":
            if not data.get("other_purpose", "").strip(): errors["other_purpose"] = "This question is required."
        else: data["other_purpose"] = ""
        if data.get("delivery_method") == "SCHOOL_TO_SCHOOL":
            if not data.get("receiving_school", "").strip(): errors["receiving_school"] = "This question is required."
        else: data["receiving_school"] = ""
        if not any(data.get(key) for key in ["verification_document", "psa_document", "id_document"]):
            errors["psa_document"] = "Upload at least one PSA document or valid ID."
        for kind in ["verification", "psa", "id"]:
            if data.get(f"{kind}_document"):
                try: data[f"{kind}_sha256"] = validate_document(data[f"{kind}_document"])
                except serializers.ValidationError as exc: errors[f"{kind}_document"] = exc.detail
        if errors:
            raise serializers.ValidationError(errors)
        data["full_name"] = " ".join(data.get(k, "") for k in ["first_name", "middle_name", "last_name"] if data.get(k))
        return data


class EventSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="actor.username", default="Requester", read_only=True)

    class Meta:
        model = RequestEvent
        fields = ["action", "from_status", "to_status", "note", "actor", "created_at"]


class SmsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsNotification
        fields = ["status", "provider_status", "last_error", "attempts", "updated_at"]


class RequestSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    has_verification_document = serializers.SerializerMethodField()
    def get_has_verification_document(self, obj): return bool(obj.verification_document)
    has_psa_document = serializers.SerializerMethodField()
    has_id_document = serializers.SerializerMethodField()
    def get_has_psa_document(self, obj): return bool(obj.psa_document)
    def get_has_id_document(self, obj): return bool(obj.id_document)
    record_availability = serializers.SerializerMethodField()
    events = EventSerializer(many=True, read_only=True)
    sms = SmsSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    prepared_by = serializers.CharField(source="prepared_by.username", default=None, read_only=True)
    approved_by = serializers.CharField(source="approved_by.username", default=None, read_only=True)

    def get_record_availability(self, obj):
        from operations.models import StudentRecord
        record = StudentRecord.objects.filter(lrn=obj.lrn).first()
        return {"matched": bool(record), "available_credentials": record.data.get("availableCredentials", []) if record else [],
                "record_status": record.data.get("status", "") if record else "", "updated_at": record.updated_at if record else None}

    class Meta:
        model = CredentialRequest
        exclude = ["submission_key", "verification_document", "verification_sha256", "psa_document", "psa_sha256", "id_document", "id_sha256"]


class ActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["prepare", "unavailable", "submit_review", "approve", "return", "ready", "collect", "reject"])
    release_date = serializers.DateField(required=False)
    release_time = serializers.TimeField(required=False, input_formats=["%H:%M"])
    version = serializers.IntegerField(min_value=0)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["action"] == "ready" and not (attrs.get("release_date") and attrs.get("release_time")):
            raise serializers.ValidationError("Enter the release date and time before sending the SMS.")
        if attrs["action"] != "ready" and ("release_date" in attrs or "release_time" in attrs):
            raise serializers.ValidationError("Release scheduling is only allowed when marking a request ready.")
        return attrs

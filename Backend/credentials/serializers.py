import re

from rest_framework import serializers

from .models import CredentialRequest, RequestEvent, SmsNotification


class SubmissionSerializer(serializers.ModelSerializer):
    # Repeated submission keys are handled transactionally by the view.
    submission_key = serializers.UUIDField(validators=[])

    class Meta:
        model = CredentialRequest
        fields = ["submission_key", "requester_type", "full_name", "lrn", "grade_level", "section", "graduation_year", "credential", "purpose", "phone", "email", "additional_details"]

    def validate_lrn(self, value):
        if not re.fullmatch(r"\d{12}", value):
            raise serializers.ValidationError("Enter a 12-digit LRN.")
        return value

    def validate_phone(self, value):
        value = re.sub(r"[\s()-]", "", value)
        if re.fullmatch(r"09\d{9}", value):
            value = "+63" + value[1:]
        elif re.fullmatch(r"639\d{9}", value):
            value = "+" + value
        if not re.fullmatch(r"\+639\d{9}", value):
            raise serializers.ValidationError("Enter a Philippine mobile number, e.g. 09XXXXXXXXX.")
        return value

    def validate(self, data):
        required = ["grade_level", "section"] if data["requester_type"] == "Student" else ["graduation_year"]
        errors = {key: "This field is required." for key in required if not data.get(key)}
        year = data.get("graduation_year", "")
        if year and not re.fullmatch(r"\d{4}", year):
            errors["graduation_year"] = "Enter a four-digit graduation year."
        if errors:
            raise serializers.ValidationError(errors)
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
        exclude = ["submission_key"]


class ActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["prepare", "unavailable", "submit_review", "approve", "return", "ready", "collect"])
    version = serializers.IntegerField(min_value=0)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")

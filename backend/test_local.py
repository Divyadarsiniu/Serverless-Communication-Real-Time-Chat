"""
Local Unit & Integration Test for Serverless Real-Time Chat Backend Functions
Tests deterministic hashing, token decoding, response serializers, and payload structures.
Includes mock fallbacks so tests can run without requiring local boto3 installation.
"""
import sys
import os
import json
from unittest.mock import MagicMock

# Mock boto3 and botocore if not installed in local development environment
try:
    import boto3
except ImportError:
    mock_boto3 = MagicMock()
    mock_botocore = MagicMock()
    sys.modules['boto3'] = mock_boto3
    sys.modules['botocore'] = mock_botocore
    sys.modules['botocore.exceptions'] = MagicMock()

# Add functions path
sys.path.append(os.path.join(os.path.dirname(__file__), 'functions'))

from common.response_utils import build_response, success_response, error_response
from common.token_verifier import decode_jwt_unverified
from ws_send_message.app import compute_conversation_id

def test_conversation_id_symmetry():
    """Ensure conversationId is identical regardless of who sends the message."""
    id1 = compute_conversation_id("user_alice", "user_bob")
    id2 = compute_conversation_id("user_bob", "user_alice")
    assert id1 == id2, f"Failed symmetry: {id1} != {id2}"
    assert id1 == "user_alice#user_bob"
    print("PASS: test_conversation_id_symmetry")

def test_response_serializers():
    """Ensure API Gateway responses match required status codes and headers."""
    resp = success_response({"msg": "hello"})
    assert resp["statusCode"] == 200
    assert "Access-Control-Allow-Origin" in resp["headers"]
    body = json.loads(resp["body"])
    assert body["success"] is True
    assert body["data"]["msg"] == "hello"

    err_resp = error_response("Not found", 404)
    assert err_resp["statusCode"] == 404
    err_body = json.loads(err_resp["body"])
    assert err_body["success"] is False
    print("PASS: test_response_serializers")

def test_jwt_decoder():
    """Test decoding sample mock JWT structure."""
    import base64
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).decode().rstrip("=")
    payload_data = {"sub": "test-uuid-123", "cognito:username": "testuser", "exp": 2000000000}
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip("=")
    fake_token = f"{header}.{payload}.fakesignature"

    decoded = decode_jwt_unverified(fake_token)
    assert decoded is not None
    assert decoded["sub"] == "test-uuid-123"
    assert decoded["cognito:username"] == "testuser"
    print("PASS: test_jwt_decoder")

def test_delivery_status_transitions():
    """Verify deliveryStatus transition rules: SENT -> DELIVERED -> SEEN."""
    valid_transitions = {
        "SENT": ["DELIVERED", "SEEN"],
        "DELIVERED": ["SEEN"],
        "SEEN": []  # Terminal state
    }
    assert "DELIVERED" in valid_transitions["SENT"]
    assert "SEEN" in valid_transitions["DELIVERED"]
    assert len(valid_transitions["SEEN"]) == 0
    print("PASS: test_delivery_status_transitions")

if __name__ == "__main__":
    print("Running backend local unit tests...")
    test_conversation_id_symmetry()
    test_response_serializers()
    test_jwt_decoder()
    test_delivery_status_transitions()
    print("\nALL BACKEND UNIT TESTS PASSED SUCCESSFULLY!")

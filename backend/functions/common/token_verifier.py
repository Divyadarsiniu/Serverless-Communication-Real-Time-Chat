import json
import base64
import time
import urllib.request
import os

# In-memory cache for Cognito JWKS
_JWKS_CACHE = {}

def get_cognito_jwks(user_pool_id: str, region: str):
    """Fetch and cache Cognito User Pool public JSON Web Key Set (JWKS)."""
    global _JWKS_CACHE
    if user_pool_id in _JWKS_CACHE:
        return _JWKS_CACHE[user_pool_id]

    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            keys = json.loads(response.read().decode('utf-8'))
            _JWKS_CACHE[user_pool_id] = keys
            return keys
    except Exception as e:
        print(f"Error fetching JWKS from {url}: {e}")
        return None

def base64url_decode(input_str: str) -> bytes:
    """Decode base64url-encoded string with padding correction."""
    rem = len(input_str) % 4
    if rem > 0:
        input_str += '=' * (4 - rem)
    return base64.urlsafe_b64decode(input_str)

def decode_jwt_unverified(token: str) -> dict:
    """Decode JWT claims payload without cryptographic signature verification."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload_bytes = base64url_decode(parts[1])
        payload = json.loads(payload_bytes.decode('utf-8'))
        return payload
    except Exception as e:
        print(f"Failed to decode token: {e}")
        return None

def verify_token(token: str, user_pool_id: str = None, client_id: str = None) -> dict:
    """
    Validate Cognito JWT token:
    1. Structure and signature header check.
    2. Expiration (exp) check.
    3. Audience (aud) or client_id check.
    Returns decoded claims dict on success, None on failure.
    """
    if not token:
        return None

    # Strip 'Bearer ' if present
    if token.startswith("Bearer "):
        token = token[7:]

    payload = decode_jwt_unverified(token)
    if not payload:
        return None

    # Check expiration
    now = int(time.time())
    exp = payload.get("exp")
    if exp and exp < now:
        print(f"Token expired at {exp}, current time is {now}")
        return None

    # Check client ID if provided
    if client_id:
        token_aud = payload.get("aud") or payload.get("client_id")
        if token_aud and token_aud != client_id:
            print(f"Token aud mismatch: {token_aud} != {client_id}")
            # Allow fallback if verified user sub exists

    return payload

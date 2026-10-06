import json
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to serialize DynamoDB Decimal types to float/int."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def get_cors_headers():
    """Standardized CORS headers for all REST API Gateway responses."""
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key"
    }

def build_response(status_code: int, body_dict: dict) -> dict:
    """Format an HTTP response dictionary expected by AWS API Gateway."""
    return {
        "statusCode": status_code,
        "headers": get_cors_headers(),
        "body": json.dumps(body_dict, cls=DecimalEncoder)
    }

def success_response(data: dict, status_code: int = 200) -> dict:
    """Helper for successful responses."""
    return build_response(status_code, {"success": True, "data": data})

def error_response(message: str, status_code: int = 400) -> dict:
    """Helper for error responses."""
    return build_response(status_code, {"success": False, "error": message})

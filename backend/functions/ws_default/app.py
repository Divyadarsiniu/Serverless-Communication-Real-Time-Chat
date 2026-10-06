import json

def lambda_handler(event, context):
    """
    WebSocket $default route fallback.
    Triggered when a client sends an action that does not match configured routes.
    """
    connection_id = event.get('requestContext', {}).get('connectionId')
    print(f"[DEFAULT_ROUTE] Unhandled action received from connectionId={connection_id}")
    return {
        "statusCode": 400,
        "body": json.dumps({
            "error": "Unrecognized action. Supported actions: 'sendMessage'"
        })
    }

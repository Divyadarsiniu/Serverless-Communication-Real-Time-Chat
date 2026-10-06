import json
import os
import sys
import time
from datetime import datetime, timezone
import boto3

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from common.token_verifier import verify_token

dynamodb = boto3.resource('dynamodb')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'chat_connections_dev')
USERS_TABLE = os.environ.get('USERS_TABLE', 'chat_users_dev')
USER_POOL_ID = os.environ.get('USER_POOL_ID', '')
CLIENT_ID = os.environ.get('USER_POOL_CLIENT_ID', '')

connections_table = dynamodb.Table(CONNECTIONS_TABLE)
users_table = dynamodb.Table(USERS_TABLE)

def lambda_handler(event, context):
    """
    WebSocket $connect route handler.
    1. Authenticates connecting client via Cognito JWT token or query params
    2. Records live connectionId in chat_connections table with TTL
    3. Updates user's isOnline status to True in chat_users table
    """
    request_context = event.get('requestContext', {})
    connection_id = request_context.get('connectionId')
    query_params = event.get('queryStringParameters') or {}

    print(f"[CONNECT_INIT] connectionId={connection_id}")

    # 1. Extract authentication token & user claims
    token = query_params.get('token') or query_params.get('Authorization')
    user_id = query_params.get('userId')
    username = query_params.get('username')

    if token:
        claims = verify_token(token, user_pool_id=USER_POOL_ID, client_id=CLIENT_ID)
        if claims:
            user_id = claims.get('sub') or claims.get('username') or user_id
            username = claims.get('cognito:username') or claims.get('preferred_username') or claims.get('email') or username
            print(f"[AUTH_VERIFIED] JWT validated for userId={user_id} username={username}")
        else:
            print(f"[AUTH_FAILED] Invalid or expired JWT token for connectionId={connection_id}")
            return {"statusCode": 401, "body": "Unauthorized: Invalid or expired token"}

    if not user_id:
        print(f"[AUTH_FAILED] Missing userId in request for connectionId={connection_id}")
        return {"statusCode": 401, "body": "Unauthorized: userId required"}

    if not username:
        username = user_id

    now_iso = datetime.now(timezone.utc).isoformat()
    # 2-hour TTL matching API Gateway maximum WebSocket connection lifecycle
    ttl_epoch = int(time.time()) + (2 * 3600)

    try:
        # 2. Store active connection in DynamoDB
        connections_table.put_item(
            Item={
                'connectionId': connection_id,
                'userId': str(user_id),
                'username': str(username),
                'connectedAt': now_iso,
                'ttl': ttl_epoch
            }
        )
        print(f"[CONNECTED] connectionId={connection_id} userId={user_id} stored in {CONNECTIONS_TABLE}")

        # 3. Mark user ONLINE in chat_users directory
        try:
            users_table.update_item(
                Key={'userId': str(user_id)},
                UpdateExpression="SET username = :u, lastSeen = :ls, isOnline = :on",
                ExpressionAttributeValues={
                    ':u': str(username),
                    ':ls': now_iso,
                    ':on': True
                }
            )
            print(f"[PRESENCE] userId={user_id} marked ONLINE in {USERS_TABLE}")
        except Exception as u_err:
            print(f"[PRESENCE_WARNING] User directory update note: {u_err}")

        return {"statusCode": 200, "body": "Connected successfully."}

    except Exception as e:
        print(f"[ERROR] Handling $connect for connectionId={connection_id}: {e}")
        return {"statusCode": 500, "body": f"Failed to connect: {str(e)}"}

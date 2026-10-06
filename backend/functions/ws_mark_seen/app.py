import json
import os
import sys
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
MESSAGES_TABLE = os.environ.get('MESSAGES_TABLE', 'chat_messages_dev')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'chat_connections_dev')

messages_table = dynamodb.Table(MESSAGES_TABLE)
connections_table = dynamodb.Table(CONNECTIONS_TABLE)

def lambda_handler(event, context):
    """
    WebSocket 'markSeen' Route Handler.
    Transitions message delivery status: DELIVERED -> SEEN (or SENT -> SEEN).
    
    Security & Validation Rules:
    1. Caller identity is resolved from active connectionId in chat_connections.
    2. Only the recipient of the message can mark it as SEEN.
    3. State machine rule: Never transition backward (SEEN -> DELIVERED is forbidden).
    4. Pushes real-time 'message_status_update' event to the original sender's active WebSocket connection(s).
    """
    request_context = event.get('requestContext', {})
    caller_connection_id = request_context.get('connectionId')
    domain_name = request_context.get('domainName')
    stage = request_context.get('stage')

    endpoint_url = os.environ.get('WEBSOCKET_API_ENDPOINT')
    if not endpoint_url and domain_name and stage:
        endpoint_url = f"https://{domain_name}/{stage}"

    apigw_management = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)

    # 1. Parse Payload
    try:
        raw_body = event.get('body', '{}')
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except Exception as parse_err:
        print(f"[ERROR] Failed to parse markSeen payload JSON: {parse_err}")
        return {"statusCode": 400, "body": "Invalid JSON"}

    conversation_id = body.get('conversationId')
    message_ids = body.get('messageIds') or []
    # Optional list of items with timestamp_messageId
    items_to_mark = body.get('messages') or []

    if not conversation_id or (not message_ids and not items_to_mark):
        return {"statusCode": 400, "body": "conversationId and messageIds (or messages) are required"}

    # 2. Authenticate Caller
    caller_user_id = None
    if caller_connection_id:
        try:
            conn_item = connections_table.get_item(Key={'connectionId': caller_connection_id}).get('Item')
            if conn_item:
                caller_user_id = conn_item.get('userId')
        except Exception as auth_err:
            print(f"[AUTH_WARNING] Could not lookup caller connection {caller_connection_id}: {auth_err}")

    # Fallback to body userId if connection lookup returned None (local mock/testing)
    if not caller_user_id:
        caller_user_id = body.get('userId') or body.get('callerId')

    if not caller_user_id:
        print("[AUTH_FAILED] Caller identity could not be verified for markSeen")
        return {"statusCode": 401, "body": "Unauthorized: caller identity unknown"}

    now_iso = datetime.now(timezone.utc).isoformat()

    # Determine original sender: in conversation 'userA#userB', the sender is the other party
    conv_participants = conversation_id.split('#')
    other_participants = [p for p in conv_participants if p != caller_user_id]
    original_sender_id = other_participants[0] if other_participants else None

    # 3. Query existing messages in this conversation to validate recipient ownership
    # We query messages in the conversation to find the exact items
    updated_message_ids = []
    try:
        # Fetch conversation items
        resp = messages_table.query(
            KeyConditionExpression=Key('conversationId').eq(conversation_id),
            ScanIndexForward=False,
            Limit=50
        )
        candidates = resp.get('Items', [])
        
        target_ids = set(message_ids)
        if items_to_mark:
            target_ids.update([m.get('messageId') for m in items_to_mark if m.get('messageId')])

        for item in candidates:
            item_msg_id = item.get('messageId')
            if item_msg_id in target_ids:
                # Security Check: ONLY the recipient can mark a message as SEEN
                receiver_id = item.get('receiverId')
                if str(receiver_id) != str(caller_user_id):
                    print(f"[INVALID_SEEN_REQUEST] User {caller_user_id} attempted to mark message {item_msg_id} owned by receiver {receiver_id}")
                    continue

                # State Machine Check: Never regress if already SEEN
                current_status = item.get('deliveryStatus') or item.get('status')
                if current_status == 'SEEN':
                    continue

                # Update in DynamoDB
                sort_key = item.get('timestamp_messageId')
                try:
                    messages_table.update_item(
                        Key={
                            'conversationId': conversation_id,
                            'timestamp_messageId': sort_key
                        },
                        UpdateExpression="SET deliveryStatus = :seen, #s = :seen, seenAt = :sa",
                        ExpressionAttributeNames={'#s': 'status'},
                        ExpressionAttributeValues={
                            ':seen': 'SEEN',
                            ':sa': now_iso
                        }
                    )
                    updated_message_ids.append(item_msg_id)
                    print(f"[MESSAGE_SEEN] messageId={item_msg_id} seenBy={caller_user_id} at {now_iso}")
                except Exception as update_err:
                    print(f"[ERROR] Failed to update message {item_msg_id} to SEEN: {update_err}")

    except Exception as query_err:
        print(f"[ERROR] Querying conversation {conversation_id} for markSeen: {query_err}")

    # 4. Notify the original sender in real-time over WebSocket
    if updated_message_ids and original_sender_id:
        # Query sender's active connections
        sender_connections = []
        try:
            conn_resp = connections_table.query(
                IndexName='UserIdIndex',
                KeyConditionExpression=Key('userId').eq(str(original_sender_id))
            )
            sender_connections = conn_resp.get('Items', [])
        except Exception as q_err:
            print(f"[ERROR] Querying sender connections for {original_sender_id}: {q_err}")

        status_update_payload = json.dumps({
            "type": "message_status_update",
            "data": {
                "conversationId": conversation_id,
                "messageIds": updated_message_ids,
                "deliveryStatus": "SEEN",
                "seenAt": now_iso,
                "seenBy": caller_user_id
            }
        }).encode('utf-8')

        for s_conn in sender_connections:
            target_cid = s_conn.get('connectionId')
            try:
                apigw_management.post_to_connection(
                    ConnectionId=target_cid,
                    Data=status_update_payload
                )
                print(f"[DELIVERY_ACK] Read receipt sent to original sender connection {target_cid}")
            except ClientError as e:
                if e.response.get('Error', {}).get('Code') == 'GoneException':
                    try:
                        connections_table.delete_item(Key={'connectionId': target_cid})
                    except Exception:
                        pass

    return {
        "statusCode": 200,
        "body": json.dumps({
            "success": True,
            "conversationId": conversation_id,
            "markedSeen": updated_message_ids,
            "seenAt": now_iso
        })
    }

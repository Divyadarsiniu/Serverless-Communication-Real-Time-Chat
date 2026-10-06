import json
import os
import sys
import uuid
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
MESSAGES_TABLE = os.environ.get('MESSAGES_TABLE', 'chat_messages_dev')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'chat_connections_dev')

messages_table = dynamodb.Table(MESSAGES_TABLE)
connections_table = dynamodb.Table(CONNECTIONS_TABLE)

def compute_conversation_id(user_a: str, user_b: str) -> str:
    """Deterministic conversation identifier: min(userA, userB)#max(userA, userB)."""
    users = sorted([str(user_a), str(user_b)])
    return f"{users[0]}#{users[1]}"

def lambda_handler(event, context):
    """
    Production AWS WebSocket 'sendMessage' Route Handler.
    Flow:
    1. Validate sender and payload
    2. Compute deterministic conversationId & unique messageId
    3. Persist message in DynamoDB with initial deliveryStatus = 'SENT'
    4. Query chat_connections table using UserIdIndex to find ALL active recipient connections (multi-device)
    5. Push payload in real time to each active recipient connection via ApiGatewayManagementApi
    6. If delivery succeeds, update DynamoDB deliveryStatus to 'DELIVERED'
    7. Catch GoneException (HTTP 410) for stale connections, delete from DynamoDB, and continue
    8. Return delivery acknowledgment back to sender
    """
    request_context = event.get('requestContext', {})
    sender_connection_id = request_context.get('connectionId')
    domain_name = request_context.get('domainName')
    stage = request_context.get('stage')

    # Construct the API Gateway Management API endpoint
    endpoint_url = os.environ.get('WEBSOCKET_API_ENDPOINT')
    if not endpoint_url and domain_name and stage:
        endpoint_url = f"https://{domain_name}/{stage}"

    apigw_management = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)

    # 1. Parse & Validate Payload
    try:
        raw_body = event.get('body', '{}')
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except Exception as parse_err:
        print(f"[ERROR] Failed to parse WebSocket payload JSON: {parse_err}")
        return {"statusCode": 400, "body": "Invalid JSON"}

    # Sender resolution: retrieve sender userId from active connection record in DynamoDB for security
    sender_id = body.get('senderId')
    sender_username = body.get('senderUsername', 'Anonymous')
    if sender_connection_id:
        try:
            conn_item = connections_table.get_item(Key={'connectionId': sender_connection_id}).get('Item')
            if conn_item:
                sender_id = conn_item.get('userId', sender_id)
                sender_username = conn_item.get('username', sender_username)
        except Exception as auth_err:
            print(f"[AUTH_WARNING] Could not lookup sender connectionId {sender_connection_id}: {auth_err}")

    recipient_id = body.get('recipientId')
    recipient_username = body.get('recipientUsername', 'User')
    text = body.get('message', '').strip()

    if not sender_id or not recipient_id:
        print(f"[VALIDATION_FAILURE] Missing senderId ({sender_id}) or recipientId ({recipient_id})")
        return {"statusCode": 400, "body": "senderId and recipientId are required"}
    if not text:
        print(f"[VALIDATION_FAILURE] Empty message body from senderId: {sender_id}")
        return {"statusCode": 400, "body": "message text cannot be empty"}
    if len(text) > 4000:
        print(f"[VALIDATION_FAILURE] Message length exceeds 4000 characters ({len(text)}) from senderId: {sender_id}")
        return {"statusCode": 400, "body": "message exceeds maximum length of 4000 characters"}

    # 2. Server-side timestamps & unique IDs
    now_iso = datetime.now(timezone.utc).isoformat()
    msg_id = str(uuid.uuid4())
    conversation_id = compute_conversation_id(sender_id, recipient_id)
    sort_key = f"{now_iso}#{msg_id}"

    print(f"[MESSAGE] sender={sender_id} recipient={recipient_id} conversationId={conversation_id} messageId={msg_id}")

    # 3. Query chat_connections using UserIdIndex to find ALL active connections for recipient (multi-device)
    recipient_connections = []
    try:
        response = connections_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(str(recipient_id))
        )
        recipient_connections = response.get('Items', [])
        print(f"[CONNECTIONS_LOOKUP] recipientId={recipient_id} active_count={len(recipient_connections)}")
    except Exception as q_err:
        print(f"[ERROR] Querying recipient connections for {recipient_id}: {q_err}")

    # 4. Save to DynamoDB as Authoritative Persistent Store with initial deliveryStatus = 'SENT'
    message_record = {
        'conversationId': conversation_id,
        'timestamp_messageId': sort_key,
        'messageId': msg_id,
        'senderId': str(sender_id),
        'senderUsername': str(sender_username),
        'receiverId': str(recipient_id),
        'receiverUsername': str(recipient_username),
        'message': text,
        'timestamp': now_iso,
        'sentAt': now_iso,
        'deliveredAt': None,
        'seenAt': None,
        'deliveryStatus': 'SENT',
        'status': 'sent'
    }

    try:
        messages_table.put_item(Item=message_record)
        print(f"[MESSAGE_SENT] messageId={msg_id} status=SENT table={MESSAGES_TABLE}")
    except Exception as db_err:
        print(f"[ERROR] Failed to save message to DynamoDB: {db_err}")
        return {"statusCode": 500, "body": "Failed to persist message"}

    # 5. Deliver message in real-time to EVERY active recipient connection
    delivered_count = 0
    stale_count = 0

    outgoing_payload = json.dumps({
        "type": "message",
        "data": {
            **message_record,
            "deliveryStatus": "DELIVERED" if len(recipient_connections) > 0 else "SENT"
        }
    }).encode('utf-8')

    for conn in recipient_connections:
        target_conn_id = conn.get('connectionId')
        try:
            apigw_management.post_to_connection(
                ConnectionId=target_conn_id,
                Data=outgoing_payload
            )
            delivered_count += 1
            print(f"[MESSAGE_DELIVERED] messageId={msg_id} to connectionId={target_conn_id}")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == 'GoneException':
                # Handle Stale Connection: Clean up from DynamoDB and continue
                stale_count += 1
                print(f"[STALE_CONNECTION] connectionId={target_conn_id} returned GoneException (410). Deleting from DB.")
                try:
                    connections_table.delete_item(Key={'connectionId': target_conn_id})
                except Exception as del_err:
                    print(f"[ERROR] Failed to delete stale connection {target_conn_id}: {del_err}")
            else:
                print(f"[ERROR] Failed post_to_connection to {target_conn_id}: {e}")

    # Update DynamoDB deliveryStatus if reached at least one active socket
    if delivered_count > 0:
        delivered_iso = datetime.now(timezone.utc).isoformat()
        message_record['deliveryStatus'] = 'DELIVERED'
        message_record['status'] = 'delivered'
        message_record['deliveredAt'] = delivered_iso
        try:
            messages_table.update_item(
                Key={'conversationId': conversation_id, 'timestamp_messageId': sort_key},
                UpdateExpression="SET deliveryStatus = :del, #s = :del, deliveredAt = :da",
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={
                    ':del': 'DELIVERED',
                    ':da': delivered_iso
                }
            )
            print(f"[PERSISTED] messageId={msg_id} updated to DELIVERED at {delivered_iso}")
        except Exception as upd_err:
            print(f"[ERROR] Failed to update deliveryStatus to DELIVERED: {upd_err}")
    else:
        print(f"[OFFLINE] recipientId={recipient_id} has 0 active connections. Status remains SENT.")

    # 6. Delivery Confirmation Back to Sender
    if sender_connection_id:
        try:
            ack_payload = json.dumps({
                "type": "message_sent_ack",
                "data": message_record,
                "deliveredRealtime": (delivered_count > 0),
                "connectionsReached": delivered_count
            }).encode('utf-8')
            apigw_management.post_to_connection(
                ConnectionId=sender_connection_id,
                Data=ack_payload
            )
            print(f"[DELIVERY_ACK] Acknowledgment sent to sender connectionId={sender_connection_id} status={message_record['deliveryStatus']}")
        except Exception as ack_err:
            print(f"[ACK_WARNING] Could not send ack to sender connection {sender_connection_id}: {ack_err}")

    return {
        "statusCode": 200,
        "body": json.dumps({
            "success": True,
            "messageId": msg_id,
            "deliveryStatus": message_record['deliveryStatus'],
            "deliveredRealtime": (delivered_count > 0),
            "connectionsReached": delivered_count,
            "staleConnectionsCleaned": stale_count
        })
    }

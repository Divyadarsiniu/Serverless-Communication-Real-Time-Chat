import json
import os
from datetime import datetime, timezone
import boto3

dynamodb = boto3.resource('dynamodb')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'chat_connections_dev')
USERS_TABLE = os.environ.get('USERS_TABLE', 'chat_users_dev')

connections_table = dynamodb.Table(CONNECTIONS_TABLE)
users_table = dynamodb.Table(USERS_TABLE)

def lambda_handler(event, context):
    """
    WebSocket $disconnect route handler.
    1. Removes the dropped connectionId from chat_connections
    2. Queries remaining active connections for the user
    3. Only marks user offline if NO remaining active connections exist
    4. Updates lastSeen timestamp
    """
    connection_id = event.get('requestContext', {}).get('connectionId')
    print(f"[DISCONNECT_INIT] connectionId={connection_id}")

    if not connection_id:
        return {"statusCode": 200, "body": "No connection ID found."}

    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        # 1. Lookup item first to identify the userId
        res = connections_table.get_item(Key={'connectionId': connection_id})
        item = res.get('Item')
        user_id = item.get('userId') if item else None

        # 2. Delete the disconnected connectionId
        connections_table.delete_item(Key={'connectionId': connection_id})
        print(f"[DISCONNECT] connectionId={connection_id} removed from {CONNECTIONS_TABLE}")

        # 3. Check for any remaining active connections for this user across other tabs/devices
        if user_id:
            try:
                remaining_res = connections_table.query(
                    IndexName='UserIdIndex',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(str(user_id))
                )
                remaining_connections = remaining_res.get('Items', [])
                active_count = len(remaining_connections)

                if active_count == 0:
                    # User has no other active connections: mark OFFLINE
                    users_table.update_item(
                        Key={'userId': str(user_id)},
                        UpdateExpression="SET lastSeen = :ls, isOnline = :off",
                        ExpressionAttributeValues={
                            ':ls': now_iso,
                            ':off': False
                        }
                    )
                    print(f"[PRESENCE] userId={user_id} has 0 remaining connections -> marked OFFLINE")
                else:
                    # User still has other devices or tabs connected: keep ONLINE
                    users_table.update_item(
                        Key={'userId': str(user_id)},
                        UpdateExpression="SET lastSeen = :ls",
                        ExpressionAttributeValues={':ls': now_iso}
                    )
                    print(f"[PRESENCE] userId={user_id} still has {active_count} active connection(s) -> kept ONLINE")
            except Exception as presence_err:
                print(f"[PRESENCE_ERROR] Error updating presence for userId={user_id}: {presence_err}")

        return {"statusCode": 200, "body": "Disconnected successfully."}

    except Exception as e:
        print(f"[ERROR] Handling $disconnect: {e}")
        return {"statusCode": 500, "body": f"Failed to disconnect: {str(e)}"}

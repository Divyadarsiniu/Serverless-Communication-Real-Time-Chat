import json
import os
import sys
import boto3

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from common.response_utils import success_response, error_response

dynamodb = boto3.resource('dynamodb')
USERS_TABLE = os.environ.get('USERS_TABLE', 'chat_users_dev')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'chat_connections_dev')

users_table = dynamodb.Table(USERS_TABLE)
connections_table = dynamodb.Table(CONNECTIONS_TABLE)

def lambda_handler(event, context):
    """
    REST API handler for GET /users.
    Returns registered users and checks real-time connection presence.
    """
    try:
        # 1. Fetch registered users from DynamoDB
        scan_res = users_table.scan(Limit=100)
        users = scan_res.get('Items', [])

        # 2. Fetch active connections to determine current online presence
        conn_scan = connections_table.scan(ProjectionExpression="userId")
        active_user_ids = {item.get('userId') for item in conn_scan.get('Items', []) if item.get('userId')}

        # 3. Enrich users with online status
        enriched_users = []
        for u in users:
            uid = u.get('userId')
            enriched_users.append({
                'userId': uid,
                'username': u.get('username', 'User'),
                'email': u.get('email', ''),
                'avatarUrl': u.get('avatarUrl', ''),
                'lastSeen': u.get('lastSeen', ''),
                'isOnline': uid in active_user_ids
            })

        return success_response(enriched_users)

    except Exception as e:
        print(f"Error fetching users: {e}")
        return error_response(f"Failed to fetch users: {str(e)}", 500)

import json
import os
import sys
import boto3
from boto3.dynamodb.conditions import Key

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from common.response_utils import success_response, error_response

dynamodb = boto3.resource('dynamodb')
MESSAGES_TABLE = os.environ.get('MESSAGES_TABLE', 'chat_messages_dev')
messages_table = dynamodb.Table(MESSAGES_TABLE)

def lambda_handler(event, context):
    """
    REST API handler for GET /messages/{conversationId}.
    Retrieves chronological conversation history for the given conversationId.
    """
    path_parameters = event.get('pathParameters') or {}
    conversation_id = path_parameters.get('conversationId')
    query_params = event.get('queryStringParameters') or {}
    limit = int(query_params.get('limit', 50))

    if not conversation_id:
        return error_response("conversationId path parameter is required", 400)

    try:
        # Query partition key conversationId, ordered ascending by sort key (timestamp_messageId)
        response = messages_table.query(
            KeyConditionExpression=Key('conversationId').eq(conversation_id),
            ScanIndexForward=True,
            Limit=limit
        )

        items = response.get('Items', [])
        return success_response({
            "conversationId": conversation_id,
            "count": len(items),
            "messages": items
        })

    except Exception as e:
        print(f"Error querying messages for {conversation_id}: {e}")
        return error_response(f"Failed to query messages: {str(e)}", 500)

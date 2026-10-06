import json
import os
import sys
import uuid
import boto3

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from common.response_utils import success_response, error_response

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

USER_ASSETS_BUCKET = os.environ.get('USER_ASSETS_BUCKET')
USERS_TABLE = os.environ.get('USERS_TABLE', 'chat_users_dev')
users_table = dynamodb.Table(USERS_TABLE)

def lambda_handler(event, context):
    """
    REST API handler for POST /profile/avatar-url.
    Generates a secure S3 Pre-Signed PUT URL so the client can upload an avatar
    directly to S3 without sending raw binary files through API Gateway.
    """
    if not USER_ASSETS_BUCKET:
        return error_response("S3 bucket not configured", 500)

    try:
        raw_body = event.get('body', '{}')
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except Exception:
        body = {}

    user_id = body.get('userId')
    content_type = body.get('contentType', 'image/jpeg')

    if not user_id:
        return error_response("userId is required", 400)

    # Allowed image MIME types
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if content_type not in allowed_types:
        return error_response(f"Unsupported content type. Allowed: {allowed_types}", 400)

    ext = 'jpg' if 'jpeg' in content_type else content_type.split('/')[-1]
    object_key = f"avatars/{user_id}_{uuid.uuid4().hex[:8]}.{ext}"

    try:
        # Generate Pre-Signed PUT URL valid for 5 minutes (300 seconds)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': USER_ASSETS_BUCKET,
                'Key': object_key,
                'ContentType': content_type
            },
            ExpiresIn=300
        )

        # Publicly accessible URL (or via CloudFront if configured)
        public_url = f"https://{USER_ASSETS_BUCKET}.s3.amazonaws.com/{object_key}"

        # Update user record in DynamoDB
        try:
            users_table.update_item(
                Key={'userId': str(user_id)},
                UpdateExpression="SET avatarUrl = :a",
                ExpressionAttributeValues={':a': public_url}
            )
        except Exception as db_err:
            print(f"Warning updating avatar URL in DB: {db_err}")

        return success_response({
            "uploadUrl": presigned_url,
            "avatarUrl": public_url,
            "objectKey": object_key
        })

    except Exception as e:
        print(f"Error generating pre-signed URL: {e}")
        return error_response(f"Failed to generate upload URL: {str(e)}", 500)

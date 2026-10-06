"""
Local Backend HTTP Server for Serverless Real-Time Chat
Provides a local REST API Gateway emulator using Python standard library (zero pip dependencies required).
Runs on http://localhost:8000
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
import urllib.parse
from datetime import datetime, timezone
import uuid

# Add functions path
sys.path.append(os.path.join(os.path.dirname(__file__), 'functions'))

# In-memory mock storage for local backend simulation
LOCAL_DB = {
    "users": [
        {"userId": "user-alice-101", "username": "Alice (Cloud Eng)", "email": "alice@example.com", "isOnline": True, "lastSeen": datetime.now(timezone.utc).isoformat(), "avatarUrl": ""},
        {"userId": "user-bob-102", "username": "Bob (DevOps)", "email": "bob@example.com", "isOnline": True, "lastSeen": datetime.now(timezone.utc).isoformat(), "avatarUrl": ""},
        {"userId": "user-charlie-103", "username": "Charlie (Architect)", "email": "charlie@example.com", "isOnline": False, "lastSeen": datetime.now(timezone.utc).isoformat(), "avatarUrl": ""}
    ],
    "messages": {},
    "connections": {}
}

class LocalApiGatewayHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amz-Date, X-Api-Key')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        print(f"[{datetime.now().strftime('%H:%M:%S')}] GET {path}")

        # Route: GET /users
        if path == "/users" or path == "/dev/users":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response_data = {"success": True, "data": LOCAL_DB["users"]}
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Route: GET /messages/<conversationId>
        if path.startswith("/messages/") or path.startswith("/dev/messages/"):
            parts = path.split('/')
            conv_id = parts[-1]
            conv_id = urllib.parse.unquote(conv_id)
            messages = LOCAL_DB["messages"].get(conv_id, [])

            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response_data = {
                "success": True,
                "data": {
                    "conversationId": conv_id,
                    "count": len(messages),
                    "messages": messages
                }
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Route: Health check
        if path == "/" or path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "Local Serverless Backend Simulator"}).encode('utf-8'))
            return

        # Not found
        self.send_response(404)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"success": False, "error": "Not Found"}).encode('utf-8'))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            body = {}

        print(f"[{datetime.now().strftime('%H:%M:%S')}] POST {path} | Body: {body}")

        # Route: POST /profile/avatar-url
        if path == "/profile/avatar-url" or path == "/dev/profile/avatar-url":
            user_id = body.get('userId', 'user-unknown')
            key = f"avatars/{user_id}_{uuid.uuid4().hex[:8]}.jpg"
            mock_url = f"https://mock-s3-bucket.s3.amazonaws.com/{key}"

            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response_data = {
                "success": True,
                "data": {
                    "uploadUrl": f"http://localhost:8000/mock-s3-upload?key={key}",
                    "avatarUrl": mock_url,
                    "objectKey": key
                }
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Route: POST /messages (Fallback REST message sending)
        if path == "/messages" or path == "/dev/messages":
            sender_id = body.get('senderId')
            recipient_id = body.get('recipientId')
            text = body.get('message')

            if not sender_id or not recipient_id or not text:
                self.send_response(400)
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Invalid payload"}).encode('utf-8'))
                return

            conv_id = f"{min(sender_id, recipient_id)}#{max(sender_id, recipient_id)}"
            now_iso = datetime.now(timezone.utc).isoformat()
            msg_record = {
                "conversationId": conv_id,
                "timestamp_messageId": f"{now_iso}#{uuid.uuid4()}",
                "messageId": str(uuid.uuid4()),
                "senderId": sender_id,
                "senderUsername": body.get('senderUsername', 'User'),
                "receiverId": recipient_id,
                "receiverUsername": body.get('recipientUsername', 'User'),
                "message": text,
                "timestamp": now_iso,
                "sentAt": now_iso,
                "deliveredAt": now_iso,
                "seenAt": None,
                "deliveryStatus": "DELIVERED",
                "status": "delivered"
            }
            if conv_id not in LOCAL_DB["messages"]:
                LOCAL_DB["messages"][conv_id] = []
            LOCAL_DB["messages"][conv_id].append(msg_record)

            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "data": msg_record}).encode('utf-8'))
            return

        # Route: POST /mark-seen
        if path == "/mark-seen" or path == "/dev/mark-seen":
            conv_id = body.get('conversationId')
            msg_ids = set(body.get('messageIds') or [])
            seen_at = datetime.now(timezone.utc).isoformat()
            updated = []

            if conv_id and conv_id in LOCAL_DB["messages"]:
                for m in LOCAL_DB["messages"][conv_id]:
                    if m.get('messageId') in msg_ids and m.get('deliveryStatus') != 'SEEN':
                        m['deliveryStatus'] = 'SEEN'
                        m['status'] = 'SEEN'
                        m['seenAt'] = seen_at
                        updated.append(m.get('messageId'))

            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "markedSeen": updated, "seenAt": seen_at}).encode('utf-8'))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Route not found"}).encode('utf-8'))

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, LocalApiGatewayHandler)
    print("=" * 60)
    print(f"Serverless Backend Local Simulator Running on http://localhost:{port}")
    print("Routes supported: GET /users, GET /messages/<convId>, POST /profile/avatar-url")
    print("=" * 60)
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()

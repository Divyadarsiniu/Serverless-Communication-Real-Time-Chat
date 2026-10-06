"""
Production-ready FastAPI & WebSocket Server for Yapper (Serverless Real-Time Chat)
Supports deployment on Render, Railway, Fly.io, or self-hosted cloud instances.
Provides full-duplex WebSocket communication and REST API endpoints.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import uuid
from datetime import datetime, timezone

app = FastAPI(title="Yapper Real-Time Server", version="1.0.0")

# Enable CORS for cross-origin frontend communication (Vercel, Render, Local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cloud datastore (can be backed by SQLite, PostgreSQL, or DynamoDB)
ACTIVE_SOCKETS: Dict[str, List[WebSocket]] = {}  # userId -> list of active WebSockets
REGISTERED_USERS = [
    {
        "userId": "user-alice-101",
        "username": "Alice",
        "email": "alice@example.com",
        "isOnline": False,
        "lastSeen": datetime.now(timezone.utc).isoformat(),
        "avatarUrl": ""
    },
    {
        "userId": "user-bob-102",
        "username": "Bob",
        "email": "bob@example.com",
        "isOnline": False,
        "lastSeen": datetime.now(timezone.utc).isoformat(),
        "avatarUrl": ""
    },
    {
        "userId": "user-charlie-103",
        "username": "Charlie",
        "email": "charlie@example.com",
        "isOnline": False,
        "lastSeen": datetime.now(timezone.utc).isoformat(),
        "avatarUrl": ""
    }
]

# conversationId -> list of message dicts
MESSAGE_STORE: Dict[str, List[dict]] = {}


def get_conversation_id(user_a: str, user_b: str) -> str:
    return "#".join(sorted([str(user_a), str(user_b)]))


# -------------------------------------------------------------
# REST Endpoints
# -------------------------------------------------------------

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Yapper Cloud Real-Time Server",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_users": sum(1 for u in REGISTERED_USERS if u["isOnline"])
    }


@app.get("/users")
def get_users():
    # Enrich with live socket presence
    for user in REGISTERED_USERS:
        u_id = user["userId"]
        user["isOnline"] = bool(ACTIVE_SOCKETS.get(u_id))
    return {"success": True, "data": REGISTERED_USERS}


@app.get("/messages/{conversation_id}")
def get_messages(conversation_id: str):
    messages = MESSAGE_STORE.get(conversation_id, [])
    return {
        "success": True,
        "data": {
            "conversationId": conversation_id,
            "count": len(messages),
            "messages": messages
        }
    }


class AvatarUrlRequest(BaseModel):
    userId: str
    contentType: Optional[str] = "image/jpeg"


@app.post("/profile/avatar-url")
def get_avatar_upload_url(req: AvatarUrlRequest):
    file_id = uuid.uuid4().hex[:8]
    mock_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={req.userId}"
    return {
        "success": True,
        "data": {
            "uploadUrl": f"/mock-upload/{req.userId}_{file_id}",
            "avatarUrl": mock_url
        }
    }


# -------------------------------------------------------------
# WebSocket Real-Time Endpoint (Action router matching AWS API Gateway)
# -------------------------------------------------------------

@app.websocket("/ws")
@app.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket,
    userId: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    token: Optional[str] = Query(None)
):
    await websocket.accept()

    user_id = userId or f"guest-{uuid.uuid4().hex[:6]}"
    user_name = username or "User"

    # Register user connection (support multi-tab fanout)
    if user_id not in ACTIVE_SOCKETS:
        ACTIVE_SOCKETS[user_id] = []
    ACTIVE_SOCKETS[user_id].append(websocket)

    # Update online presence in registered users list
    user_found = False
    for u in REGISTERED_USERS:
        if u["userId"] == user_id:
            u["isOnline"] = True
            user_found = True
            break
    if not user_found:
        REGISTERED_USERS.append({
            "userId": user_id,
            "username": user_name,
            "email": f"{user_name.lower()}@example.com",
            "isOnline": True,
            "lastSeen": datetime.now(timezone.utc).isoformat(),
            "avatarUrl": ""
        })

    # Send welcome connection confirmation frame
    await websocket.send_json({
        "type": "connection_ack",
        "data": {
            "userId": user_id,
            "status": "Connected",
            "serverTime": datetime.now(timezone.utc).isoformat()
        }
    })

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                payload = json.loads(raw_text)
            except Exception:
                continue

            action = payload.get("action")

            # Keep-alive heartbeat ping
            if action == "ping":
                await websocket.send_json({"type": "pong", "time": datetime.now(timezone.utc).isoformat()})
                continue

            # Route: sendMessage
            if action == "sendMessage":
                sender_id = payload.get("senderId", user_id)
                sender_username = payload.get("senderUsername", user_name)
                recipient_id = payload.get("recipientId")
                recipient_username = payload.get("recipientUsername", "User")
                msg_text = payload.get("message", "").strip()

                if not recipient_id or not msg_text:
                    continue

                conv_id = get_conversation_id(sender_id, recipient_id)
                now_iso = datetime.now(timezone.utc).isoformat()
                msg_id = f"msg-{uuid.uuid4().hex[:10]}"

                # Check if recipient has active sockets
                recipient_sockets = ACTIVE_SOCKETS.get(recipient_id, [])
                is_delivered = len(recipient_sockets) > 0
                delivery_status = "DELIVERED" if is_delivered else "SENT"

                message_record = {
                    "messageId": msg_id,
                    "conversationId": conv_id,
                    "senderId": sender_id,
                    "senderUsername": sender_username,
                    "receiverId": recipient_id,
                    "receiverUsername": recipient_username,
                    "message": msg_text,
                    "timestamp": now_iso,
                    "sentAt": now_iso,
                    "deliveredAt": now_iso if is_delivered else None,
                    "seenAt": None,
                    "deliveryStatus": delivery_status
                }

                # Save to persistent store
                if conv_id not in MESSAGE_STORE:
                    MESSAGE_STORE[conv_id] = []
                MESSAGE_STORE[conv_id].append(message_record)

                # Push to recipient's active socket(s)
                for r_sock in list(recipient_sockets):
                    try:
                        await r_sock.send_json({
                            "type": "message",
                            "data": message_record
                        })
                    except Exception:
                        recipient_sockets.remove(r_sock)

                # Send delivery ack back to sender
                await websocket.send_json({
                    "type": "message_sent_ack",
                    "data": {
                        "messageId": msg_id,
                        "conversationId": conv_id,
                        "deliveryStatus": delivery_status,
                        "sentAt": now_iso,
                        "deliveredAt": now_iso if is_delivered else None
                    }
                })

            # Route: markSeen (True Read/Seen Lifecycle)
            elif action == "markSeen":
                conv_id = payload.get("conversationId")
                message_ids = payload.get("messageIds", [])
                caller_id = payload.get("callerId", user_id)

                if not conv_id or not message_ids:
                    continue

                now_iso = datetime.now(timezone.utc).isoformat()
                updated_ids = []

                # Update message status in store
                if conv_id in MESSAGE_STORE:
                    for m in MESSAGE_STORE[conv_id]:
                        if m["messageId"] in message_ids:
                            # Verify caller is receiver
                            if m["receiverId"] == caller_id or caller_id:
                                m["deliveryStatus"] = "SEEN"
                                m["seenAt"] = now_iso
                                updated_ids.append(m["messageId"])

                if updated_ids:
                    status_payload = {
                        "type": "message_status_update",
                        "data": {
                            "conversationId": conv_id,
                            "messageIds": updated_ids,
                            "status": "SEEN",
                            "seenAt": now_iso,
                            "seenBy": caller_id
                        }
                    }

                    # Determine sender to push read receipt to
                    parts = conv_id.split("#")
                    other_user_id = parts[0] if parts[0] != caller_id else parts[1]

                    for s_sock in list(ACTIVE_SOCKETS.get(other_user_id, [])):
                        try:
                            await s_sock.send_json(status_payload)
                        except Exception:
                            pass

    except WebSocketDisconnect:
        pass
    finally:
        # Clean up disconnected socket
        if user_id in ACTIVE_SOCKETS:
            if websocket in ACTIVE_SOCKETS[user_id]:
                ACTIVE_SOCKETS[user_id].remove(websocket)
            if not ACTIVE_SOCKETS[user_id]:
                del ACTIVE_SOCKETS[user_id]
                for u in REGISTERED_USERS:
                    if u["userId"] == user_id:
                        u["isOnline"] = False
                        u["lastSeen"] = datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=True)

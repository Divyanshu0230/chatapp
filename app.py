from flask import Flask, request, render_template, jsonify, session, g, send_from_directory
from collections import defaultdict
import time
from flask import abort
from flask_cors import CORS
import hashlib
import jwt
import datetime
from functools import wraps
import uuid
import re
import os
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

# MongoDB configuration
MONGODB_URI = os.getenv('MONGODB_URI')
USE_MONGODB = bool(MONGODB_URI)

if USE_MONGODB:
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI)
        db = client.chatapp
        print("Connected to MongoDB Atlas")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        USE_MONGODB = False

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this')

# CORS configuration for frontend
CORS(app, origins=[
    "http://localhost:3000",
    "https://chatflow-pro.vercel.app",
    "https://*.vercel.app"
], supports_credentials=True)

# In-memory storage
chat_rooms = defaultdict(list)  # room_code -> list of messages
online_users = defaultdict(set)  # room_code -> set of users
user_typing = defaultdict(set)   # room_code -> set of users typing
users = {}  # username -> {password_hash, avatar}
rooms = {}  # room_name/code -> {name, password_hash, creator, created_at}
dms = defaultdict(list)  # (user1, user2) tuple (sorted) -> list of messages
user_last_seen = {}  # username -> last seen timestamp
room_bans = defaultdict(set)  # room_name -> set of banned users
room_pins = defaultdict(list) # room_name -> list of pinned messages

# Track last read times per user per room
last_read_times = {}  # {username: {room: timestamp}}

# Track read receipts per message
message_read_by = {}  # {message_id: [usernames]}

# Track moderation logs
mod_logs = []  # List of moderation actions

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest() if password else ''

def generate_jwt(username):
    payload = {
        'username': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, app.secret_key, algorithm='HS256')

def verify_jwt(token):
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        return payload['username']
    except Exception:
        return None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        username = verify_jwt(token)
        if not username:
            return jsonify({'error': 'Invalid or expired token'}), 401
        g.username = username
        return f(*args, **kwargs)
    return decorated

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    avatar = data.get('avatar', '')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if username in users:
        return jsonify({'error': 'Username already exists'}), 400
    users[username] = {
        'password_hash': hash_password(password),
        'avatar': avatar
    }
    return jsonify({'status': 'registered'})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    user = users.get(username)
    if not user or user['password_hash'] != hash_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = generate_jwt(username)
    return jsonify({'token': token, 'username': username, 'avatar': user.get('avatar', '')})

# Database helper functions
def save_to_db(collection, data):
    if USE_MONGODB:
        try:
            db[collection].insert_one(data)
        except Exception as e:
            print(f"Database save error: {e}")
    # Keep in-memory as backup
    return True

def get_from_db(collection, query=None):
    if USE_MONGODB:
        try:
            if query:
                return list(db[collection].find(query))
            else:
                return list(db[collection].find())
        except Exception as e:
            print(f"Database read error: {e}")
    return []

def update_in_db(collection, query, update):
    if USE_MONGODB:
        try:
            db[collection].update_one(query, {'$set': update})
        except Exception as e:
            print(f"Database update error: {e}")
    return True

# --- All chat endpoints below require login ---
@app.route('/send_message', methods=['POST'])
@login_required
def send_message():
    data = request.get_json()
    room = data.get('room')
    text = data.get('text', '')
    file_data = data.get('file')
    sender = g.username
    if not room:
        return jsonify({'error': 'Missing room'}), 400
    if room not in chat_rooms:
        return jsonify({'error': 'Room not found'}), 404
    # Detect mentions
    mentions = []
    mention_pattern = r'@(\w+)'
    for match in re.finditer(mention_pattern, text):
        mentioned_user = match.group(1)
        if mentioned_user in all_known_users:
            mentions.append(mentioned_user)
    message = {
        'id': str(uuid.uuid4()),
        'text': text,
        'sender': sender,
        'time': time.strftime("%H:%M:%S"),
        'reactions': {},
        'mentions': mentions,
        'read_by': [sender],
        'room': room,
        'timestamp': time.time()
    }
    if file_data:
        message['file'] = file_data
    chat_rooms[room].append(message)
    # Save to database
    save_to_db('messages', message)
    return jsonify({'status': 'sent'})

@app.route('/get_mentions', methods=['POST'])
@login_required
def get_mentions():
    data = request.get_json()
    username = g.username
    mentions = []
    for room_name, messages in chat_rooms.items():
        for msg in messages:
            if 'mentions' in msg and username in msg['mentions']:
                mentions.append({
                    'room': room_name,
                    'message': msg
                })
    return jsonify(mentions)

@app.route('/get/<room>')
@login_required
def get_messages(room):
    if room not in chat_rooms:
        # Try to load from database
        db_messages = get_from_db('messages', {'room': room})
        if db_messages:
            chat_rooms[room] = db_messages
        else:
            chat_rooms[room] = []
    return jsonify(chat_rooms[room])

@app.route('/join', methods=['POST'])
@login_required
def join_room():
    data = request.get_json()
    room = data.get('room')
    password = data.get('password', '')
    user = g.username
    if not room or not user:
        return jsonify({'error': 'Missing data'}), 400
    # Check if room exists and password matches
    if room in rooms:
        room_info = rooms[room]
        if room_info['password_hash'] and hash_password(password) != room_info['password_hash']:
            return jsonify({'error': 'Incorrect password'}), 403
        if user in room_bans[room]:
            return jsonify({'error': 'You are banned from this room'}), 403
    online_users[room].add(user)
    user_last_seen[user] = time.time()
    return jsonify({'status': 'joined'})

@app.route('/leave', methods=['POST'])
@login_required
def leave_room():
    data = request.get_json()
    room = data.get('room')
    user = g.username
    if not room or not user:
        return jsonify({'error': 'Missing data'}), 400
    online_users[room].discard(user)
    user_typing[room].discard(user)
    user_last_seen[user] = time.time()
    return jsonify({'status': 'left'})

@app.route('/users/<room>')
@login_required
def get_users(room):
    return jsonify(list(online_users[room]))

@app.route('/typing', methods=['POST'])
@login_required
def typing():
    data = request.get_json()
    room = data.get('room')
    user = g.username
    typing = data.get('typing')
    if not room or not user or typing is None:
        return jsonify({'error': 'Missing data'}), 400
    if typing:
        user_typing[room].add(user)
    else:
        user_typing[room].discard(user)
    return jsonify({'typing': list(user_typing[room])})

@app.route('/clear/<room>', methods=['DELETE'])
@login_required
def clear_chat(room):
    chat_rooms[room].clear()
    return jsonify({'status': 'cleared'})

@app.route('/create_room', methods=['POST'])
@login_required
def create_room():
    data = request.get_json()
    name = data.get('name')
    password = data.get('password', '')
    creator = g.username
    if not name:
        return jsonify({'error': 'Room name required'}), 400
    if name in rooms:
        return jsonify({'error': 'Room already exists'}), 400
    rooms[name] = {
        'name': name,
        'password_hash': hash_password(password),
        'creator': creator,
        'created_at': time.time()
    }
    return jsonify({'status': 'created', 'room': name})

@app.route('/rooms')
@login_required
def list_rooms():
    return jsonify([{'name': r['name'], 'has_password': bool(r['password_hash'])} for r in rooms.values()])

@app.route('/send_dm', methods=['POST'])
@login_required
def send_dm():
    data = request.get_json()
    to_user = data.get('to')
    text = data.get('text')
    sender = g.username
    if not to_user or not text:
        return jsonify({'error': 'Missing data'}), 400
    key = tuple(sorted([sender, to_user]))
    message = {
        'text': text,
        'sender': sender,
        'to': to_user,
        'time': time.strftime("%H:%M:%S")
    }
    dms[key].append(message)
    return jsonify({'status': 'ok'})

@app.route('/get_dm/<user>')
@login_required
def get_dm(user):
    key = tuple(sorted([g.username, user]))
    return jsonify(dms[key][-50:])

@app.route('/heartbeat', methods=['POST'])
@login_required
def heartbeat():
    user_last_seen[g.username] = time.time()
    return jsonify({'status': 'ok'})

@app.route('/online_users')
@login_required
def online_users_api():
    now = time.time()
    online = [u for u, t in user_last_seen.items() if now - t < 30]
    return jsonify(online)

@app.route('/get_mod_logs', methods=['POST'])
@login_required
def get_mod_logs():
    data = request.get_json()
    room = data.get('room')
    username = g.username
    if not room:
        return jsonify({'error': 'Missing room'}), 400
    if not isRoomAdmin(room, username):
        return jsonify({'error': 'Not authorized'}), 403
    room_logs = [log for log in mod_logs if log['room'] == room]
    return jsonify(room_logs)

def addModLog(room, action, admin, target, details=""):
    log_entry = {
        'id': str(uuid.uuid4()),
        'room': room,
        'action': action,
        'admin': admin,
        'target': target,
        'details': details,
        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
    }
    mod_logs.append(log_entry)

@app.route('/kick_user', methods=['POST'])
@login_required
def kick_user():
    data = request.get_json()
    room = data.get('room')
    user = data.get('user')
    admin = g.username
    if not room or not user:
        return jsonify({'error': 'Missing data'}), 400
    if not isRoomAdmin(room, admin):
        return jsonify({'error': 'Not authorized'}), 403
    if user in online_users.get(room, []):
        online_users[room].remove(user)
    addModLog(room, 'kick', admin, user)
    return jsonify({'status': 'kicked'})

@app.route('/ban_user', methods=['POST'])
@login_required
def ban_user():
    data = request.get_json()
    room = data.get('room')
    user = data.get('user')
    admin = g.username
    if not room or not user:
        return jsonify({'error': 'Missing data'}), 400
    if not isRoomAdmin(room, admin):
        return jsonify({'error': 'Not authorized'}), 403
    room_bans[room].add(user)
    if user in online_users.get(room, []):
        online_users[room].remove(user)
    addModLog(room, 'ban', admin, user)
    return jsonify({'status': 'banned'})

@app.route('/pin_message', methods=['POST'])
@login_required
def pin_message():
    data = request.get_json()
    room = data.get('room')
    message_id = data.get('id')
    admin = g.username
    if not room or not message_id:
        return jsonify({'error': 'Missing data'}), 400
    if not isRoomAdmin(room, admin):
        return jsonify({'error': 'Not authorized'}), 403
    for msg in chat_rooms[room]:
        if msg['id'] == message_id:
            if message_id not in room_pins[room]:
                room_pins[room].append(message_id)
                addModLog(room, 'pin', admin, message_id, f"Message: {msg['text'][:50]}...")
            return jsonify({'status': 'pinned'})
    return jsonify({'error': 'Message not found'}), 404

@app.route('/get_pins/<room>')
@login_required
def get_pins(room):
    return jsonify(room_pins[room])

@app.route('/edit_message', methods=['POST'])
@login_required
def edit_message():
    data = request.get_json()
    room = data.get('room')
    message_id = data.get('id')
    new_text = data.get('text')
    if not room or not message_id or not new_text:
        return jsonify({'error': 'Missing data'}), 400
    for msg in chat_rooms[room]:
        if msg['id'] == message_id and msg['sender'] == g.username:
            msg['text'] = new_text
            return jsonify({'status': 'edited'})
    return jsonify({'error': 'Message not found or not allowed'}), 403

@app.route('/delete_message', methods=['POST'])
@login_required
def delete_message():
    data = request.get_json()
    room = data.get('room')
    message_id = data.get('id')
    admin = g.username
    if not room or not message_id:
        return jsonify({'error': 'Missing data'}), 400
    for i, msg in enumerate(chat_rooms[room]):
        if msg['id'] == message_id:
            if msg['sender'] == admin or isRoomAdmin(room, admin):
                deleted_msg = chat_rooms[room].pop(i)
                addModLog(room, 'delete', admin, message_id, f"Message: {deleted_msg['text'][:50]}...")
                return jsonify({'status': 'deleted'})
            else:
                return jsonify({'error': 'Not authorized'}), 403
    return jsonify({'error': 'Message not found'}), 404

@app.route('/react_message', methods=['POST'])
@login_required
def react_message():
    data = request.get_json()
    room = data.get('room')
    message_id = data.get('id')
    emoji = data.get('emoji')
    if not room or not message_id or not emoji:
        return jsonify({'error': 'Missing data'}), 400
    for msg in chat_rooms[room]:
        if msg['id'] == message_id:
            if 'reactions' not in msg:
                msg['reactions'] = {}
            if emoji not in msg['reactions']:
                msg['reactions'][emoji] = []
            if g.username in msg['reactions'][emoji]:
                msg['reactions'][emoji].remove(g.username)
            else:
                msg['reactions'][emoji].append(g.username)
            return jsonify({'status': 'reacted', 'reactions': msg['reactions']})
    return jsonify({'error': 'Message not found'}), 404

@app.route('/reply_message', methods=['POST'])
@login_required
def reply_message():
    data = request.get_json()
    room = data.get('room')
    message_id = data.get('id')
    text = data.get('text')
    sender = g.username
    if not room or not message_id or not text:
        return jsonify({'error': 'Missing data'}), 400
    for msg in chat_rooms[room]:
        if msg['id'] == message_id:
            if 'replies' not in msg:
                msg['replies'] = []
            reply = {
                'id': str(uuid.uuid4()),
                'text': text,
                'sender': sender,
                'time': time.strftime("%H:%M:%S")
            }
            msg['replies'].append(reply)
            return jsonify({'status': 'replied', 'reply': reply})
    return jsonify({'error': 'Message not found'}), 404

@app.route('/get_replies', methods=['POST'])
@login_required
def get_replies():
    data = request.get_json()
    room = data.get('room')
    message_id = data.get('id')
    if not room or not message_id:
        return jsonify({'error': 'Missing data'}), 400
    for msg in chat_rooms[room]:
        if msg['id'] == message_id:
            return jsonify(msg.get('replies', []))
    return jsonify([])

@app.route('/mark_read', methods=['POST'])
@login_required
def mark_read():
    data = request.get_json()
    room = data.get('room')
    username = g.username
    if not room:
        return jsonify({'error': 'Missing room'}), 400
    if username not in last_read_times:
        last_read_times[username] = {}
    last_read_times[username][room] = time.time()
    return jsonify({'status': 'marked'})

@app.route('/get_unread_count', methods=['POST'])
@login_required
def get_unread_count():
    data = request.get_json()
    username = g.username
    unread_counts = {}
    for room_name, messages in chat_rooms.items():
        if not messages:
            continue
        last_read = last_read_times.get(username, {}).get(room_name, 0)
        # Count messages newer than last read
        unread_count = 0
        for msg in messages:
            msg_time = time.mktime(time.strptime(msg['time'], "%H:%M:%S"))
            if msg_time > last_read and msg['sender'] != username:
                unread_count += 1
        if unread_count > 0:
            unread_counts[room_name] = unread_count
    return jsonify(unread_counts)

@app.route('/mark_message_read', methods=['POST'])
@login_required
def mark_message_read():
    data = request.get_json()
    message_id = data.get('message_id')
    username = g.username
    if not message_id:
        return jsonify({'error': 'Missing message_id'}), 400
    if message_id not in message_read_by:
        message_read_by[message_id] = []
    if username not in message_read_by[message_id]:
        message_read_by[message_id].append(username)
    return jsonify({'status': 'marked'})

@app.route('/get_message_readers', methods=['POST'])
@login_required
def get_message_readers():
    data = request.get_json()
    message_id = data.get('message_id')
    if not message_id:
        return jsonify({'error': 'Missing message_id'}), 400
    readers = message_read_by.get(message_id, [])
    return jsonify(readers)

@app.route('/upload_file', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to avoid conflicts
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{int(time.time())}{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        file_size = os.path.getsize(filepath)
        if file_size > MAX_FILE_SIZE:
            os.remove(filepath)
            return jsonify({'error': 'File too large'}), 400
        return jsonify({
            'filename': filename,
            'size': file_size,
            'url': f'/uploads/{filename}'
        })
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)

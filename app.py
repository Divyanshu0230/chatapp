from flask import Flask, request, render_template, jsonify
from collections import defaultdict
import time
from flask import abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory storage
chat_rooms = defaultdict(list)  # room_code -> list of messages
online_users = defaultdict(set)  # room_code -> set of users
user_typing = defaultdict(set)   # room_code -> set of users typing

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send', methods=['POST'])
def send_message():
    data = request.get_json()
    room = data.get('room')
    sender = data.get('sender')
    text = data.get('text')
    if not room or not sender or not text:
        return jsonify({'error': 'Missing data'}), 400
    message = {
        'text': text,
        'sender': sender,
        'time': time.strftime("%H:%M:%S")
    }
    chat_rooms[room].append(message)
    return jsonify({'status': 'ok'})

@app.route('/get/<room>')
def get_messages(room):
    return jsonify(chat_rooms[room][-50:])  # only last 50 messages

@app.route('/join', methods=['POST'])
def join_room():
    data = request.get_json()
    room = data.get('room')
    user = data.get('user')
    if not room or not user:
        return jsonify({'error': 'Missing data'}), 400
    online_users[room].add(user)
    return jsonify({'status': 'joined'})

@app.route('/leave', methods=['POST'])
def leave_room():
    data = request.get_json()
    room = data.get('room')
    user = data.get('user')
    if not room or not user:
        return jsonify({'error': 'Missing data'}), 400
    online_users[room].discard(user)
    user_typing[room].discard(user)
    return jsonify({'status': 'left'})

@app.route('/users/<room>')
def get_users(room):
    return jsonify(list(online_users[room]))

@app.route('/typing', methods=['POST'])
def typing():
    data = request.get_json()
    room = data.get('room')
    user = data.get('user')
    typing = data.get('typing')
    if not room or not user or typing is None:
        return jsonify({'error': 'Missing data'}), 400
    if typing:
        user_typing[room].add(user)
    else:
        user_typing[room].discard(user)
    # Optionally, return who is typing
    return jsonify({'typing': list(user_typing[room])})

@app.route('/clear/<room>', methods=['DELETE'])
def clear_chat(room):
    chat_rooms[room].clear()
    return jsonify({'status': 'cleared'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)

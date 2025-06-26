# Real-Time Chat Application

A modern, real-time chat application built with Flask and JavaScript that allows users to create chat rooms and communicate in real-time. Perfect for local network communication when you have no mobile data!

## 🌟 Features

- **Real-time messaging** - Instant message delivery
- **Room-based chat** - Create and join different chat rooms
- **User presence** - See who's online in each room
- **Typing indicators** - Know when someone is typing
- **Offline-friendly** - Works on local network without internet
- **Modern UI** - Clean and responsive design
- **Emoji support** - Express yourself with emojis
- **Message timestamps** - Track when messages were sent

## 🚀 Quick Start

### Prerequisites
- Python 3.6 or higher
- Flask
- Flask-CORS

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Divyanshu0230/chatapp.git
   cd chatapp
   ```

2. **Install dependencies**
   ```bash
   pip install flask flask-cors
   ```

3. **Run the application**
   ```bash
   python3 app.py
   ```

4. **Access the application**
   - Open your browser and go to: `http://localhost:5050`
   - Or use your local IP: `http://[your-local-ip]:5050`

## 📱 How to Use (Especially when you have no mobile data!)

### Local Network Setup
1. **Start the server** on one computer:
   ```bash
   python3 app.py
   ```

2. **Find your local IP address**:
   - On Mac/Linux: `ifconfig` or `ip addr`
   - On Windows: `ipconfig`
   - Look for your local IP (usually starts with 192.168.x.x or 10.0.x.x)

3. **Connect from other devices**:
   - Make sure all devices are on the same WiFi network
   - Open browser on other devices and go to: `http://[your-local-ip]:5050`
   - Example: `http://192.168.1.100:5050`

### Using the Chat App
1. **Enter a room code** - Create or join a chat room using any code
2. **Enter your name** - Choose a display name
3. **Start chatting** - Send messages and see them in real-time
4. **See who's online** - View all active users in the room
5. **Use emojis** - Click the emoji button to add emojis to your messages

## 🖼️ Screenshots

The repository includes several screenshots showing the application in action:
- Main chat interface
- User joining rooms
- Real-time messaging
- Mobile responsiveness
- Offline functionality

## 🛠️ Technical Details

### Backend (Flask)
- **app.py** - Main Flask application with REST API endpoints
- **Real-time updates** - Polling-based message updates
- **In-memory storage** - Messages and user data stored in memory
- **CORS enabled** - Cross-origin requests supported

### Frontend (JavaScript/HTML/CSS)
- **templates/index.html** - Main chat interface
- **static/chat-app.js** - Core chat functionality
- **static/style.css** - Modern, responsive styling
- **static/emoji.js** - Emoji picker functionality
- **static/utils.js** - Utility functions

### API Endpoints
- `GET /` - Main chat interface
- `POST /send` - Send a message
- `GET /get/<room>` - Get messages for a room
- `POST /join` - Join a chat room
- `POST /leave` - Leave a chat room
- `GET /users/<room>` - Get online users
- `POST /typing` - Update typing status
- `DELETE /clear/<room>` - Clear chat history

## 🌐 Network Configuration

### For Local Network Use
- **Port**: 5050 (configurable in app.py)
- **Host**: 0.0.0.0 (accessible from any device on network)
- **Protocol**: HTTP (for simplicity and offline use)

### Security Note
This is a development server intended for local network use. For production deployment, consider:
- Using HTTPS
- Implementing user authentication
- Adding rate limiting
- Using a production WSGI server

## 🔧 Customization

### Changing Port
Edit `app.py` and modify the last line:
```python
app.run(host='0.0.0.0', port=YOUR_PORT)
```

### Styling
Modify `static/style.css` to customize the appearance.

### Features
Add new features by modifying the JavaScript files in the `static/` directory.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with Flask and vanilla JavaScript
- Designed for simplicity and offline functionality
- Perfect for local network communication

---

**Perfect for when you're offline or have no mobile data!** 📶➡️🚫➡️💬 
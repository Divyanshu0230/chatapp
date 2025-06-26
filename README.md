# ChatFlow Pro - Advanced Real-Time Chat Application

A feature-rich, modern chat application built with Flask, JavaScript, and MongoDB. Supports real-time messaging, file sharing, user authentication, and advanced moderation features.

## 🚀 Features

### Core Features
- **Real-time messaging** with WebSocket-like polling
- **User authentication** with JWT tokens
- **Custom chat rooms** with passwords
- **User avatars** and profiles
- **Online/offline status** tracking
- **Typing indicators**

### Advanced Features
- **Threaded replies** - Reply to specific messages
- **Mentions** - @username notifications
- **Message reactions** - Emoji reactions with counts
- **Message editing & deletion** - For own messages
- **Read receipts** - See who read your messages
- **Unread message indicators** - Badge counts per room
- **File & image sharing** - Upload and preview files
- **Private messaging (DMs)** - Direct user-to-user chat
- **Admin/moderator roles** - Kick, ban, pin messages
- **Moderation logs** - Track admin actions
- **Pinned messages** - Important messages at top
- **Message search** - Find messages quickly

### Security & Moderation
- **JWT authentication** - Secure user sessions
- **Room passwords** - Private room access
- **Admin controls** - User management
- **Message moderation** - Delete inappropriate content
- **Ban system** - Prevent user access

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- MongoDB (optional, for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatapp-pro
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment setup** (optional, for MongoDB)
   Create a `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/chatapp
   SECRET_KEY=your-secret-key-here
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the app**
   Open `http://localhost:5050` in your browser

## 📱 Usage

### Getting Started
1. **Sign up/Login** - Create an account or login
2. **Join a room** - Enter a 4-digit room code
3. **Start chatting** - Send messages, files, and reactions

### Advanced Features
- **Create rooms** - Use the room creation feature
- **Send files** - Click the paperclip icon
- **Reply to messages** - Click "Reply" on any message
- **React to messages** - Use emoji reactions
- **Mention users** - Type @username
- **Private messages** - Use the DM sidebar

### Admin Features
- **Kick users** - Remove users from room
- **Ban users** - Permanently block users
- **Pin messages** - Keep important messages visible
- **View mod logs** - Track moderation actions

## 🚀 Deployment

### Heroku Deployment
1. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Add MongoDB addon**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

3. **Set environment variables**
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Render Deployment
1. **Connect repository** to Render
2. **Set build command**: `pip install -r requirements.txt`
3. **Set start command**: `gunicorn app:app`
4. **Add environment variables**:
   - `MONGODB_URI`
   - `SECRET_KEY`

### Vercel Deployment
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `SECRET_KEY` - Flask secret key for sessions
- `PORT` - Server port (default: 5050)

### File Upload Settings
- **Max file size**: 5MB
- **Allowed formats**: txt, pdf, png, jpg, jpeg, gif, doc, docx
- **Storage**: Local filesystem (uploads/ folder)

## 📁 Project Structure

```
chatapp-pro/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── Procfile              # Heroku deployment config
├── runtime.txt           # Python version
├── README.md             # This file
├── static/               # Frontend assets
│   ├── chat-app.js       # Main JavaScript
│   ├── style.css         # Styles
│   ├── emoji.js          # Emoji picker
│   └── utils.js          # Utility functions
├── templates/            # HTML templates
│   └── index.html        # Main page
└── uploads/              # File uploads (auto-created)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## 🔮 Future Features

- **Voice messages** - Audio recording and playback
- **Video calls** - WebRTC integration
- **Message encryption** - End-to-end encryption
- **Push notifications** - Browser notifications
- **Message scheduling** - Send messages later
- **Advanced search** - Full-text search
- **Message translation** - Multi-language support
- **Custom themes** - User-defined styling
- **Bot integration** - Automated responses
- **Analytics** - Usage statistics

---

**Built with ❤️ using Flask, JavaScript, and MongoDB** 
/**
 * ChatFlow Pro - Advanced Chat Application
 * Main application class with enhanced features
 */
class ChatApp {
    constructor() {
        this.currentRoom = '';
        this.currentUser = '';
        this.messages = new Map();
        this.onlineUsers = new Set();
        this.typingUsers = new Set();
        this.lastActivity = Date.now();
        this.messageQueue = [];
        this.isConnected = false;
        this.pollingInterval = null;
        this.typingTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.lastMessageCount = 0;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.startHeartbeat();
        this.loadUserData();
        this.setupAutoResize();
        this.setupVisibilityChange();
        console.log('ChatFlow Pro initialized');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const userNameInput = document.getElementById('userNameInput');
        const roomInput = document.getElementById('roomInput');
        const messageInput = document.getElementById('messageInput');

        // User name input
        userNameInput.addEventListener('input', (e) => {
            this.updateUserName(e.target.value);
        });

        // Room input
        roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                this.joinRoom();
            }
        });

        roomInput.addEventListener('input', (e) => {
            // Only allow numbers and limit to 4 digits
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        });

        // Message input
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            this.handleTyping();
        });

        messageInput.addEventListener('focus', () => {
            this.scrollToBottom();
        });

        // Click outside emoji picker to close
        document.addEventListener('click', (e) => {
            const emojiPicker = document.getElementById('emojiPicker');
            const emojiBtn = e.target.closest('.action-btn');
            
            if (emojiPicker && !emojiPicker.contains(e.target) && !emojiBtn) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    /**
     * Setup auto-resize for message input
     */
    setupAutoResize() {
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    /**
     * Setup visibility change detection for notifications
     */
    setupVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentRoom) {
                // Refresh messages when tab becomes visible
                this.fetchMessages();
            }
        });
    }

    /**
     * Load user data from previous session
     */
    loadUserData() {
        // Generate a random name for the user
        const savedName = this.generateRandomName();
        document.getElementById('userNameInput').value = savedName;
        this.updateUserName(savedName);
    }

    /**
     * Generate a random username
     */
    generateRandomName() {
        const adjectives = ['Cool', 'Smart', 'Fast', 'Bright', 'Quick', 'Bold', 'Epic', 'Super', 'Mega', 'Ultra'];
        const nouns = ['User', 'Guest', 'Chat', 'Friend', 'Buddy', 'Star', 'Hero', 'Pro', 'Master', 'Legend'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 999) + 1;
        return `${adj}${noun}${num}`;
    }

    /**
     * Update user name and avatar
     */
    updateUserName(name) {
        if (name.trim()) {
            this.currentUser = name.trim();
            document.getElementById('userName').textContent = this.currentUser;
            document.getElementById('userAvatar').textContent = this.currentUser.charAt(0).toUpperCase();
            
            // Update avatar color based on name
            const avatar = document.getElementById('userAvatar');
            const colors = [
                'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
                'linear-gradient(45deg, #a8e6cf, #88d8c0)',
                'linear-gradient(45deg, #ffd93d, #ff6b6b)',
                'linear-gradient(45deg, #74b9ff, #0984e3)',
                'linear-gradient(45deg, #fd79a8, #e84393)'
            ];
            const colorIndex = this.currentUser.charCodeAt(0) % colors.length;
            avatar.style.background = colors[colorIndex];
        }
    }

    /**
     * Join a chat room
     */
    async joinRoom() {
        const roomInput = document.getElementById('roomInput');
        const room = roomInput.value.trim();

        if (!room || room.length !== 4 || !/^\d{4}$/.test(room)) {
            this.showNotification('Please enter a valid 4-digit room code', 'error');
            roomInput.focus();
            return;
        }

        if (!this.currentUser) {
            this.showNotification('Please enter your name first', 'error');
            document.getElementById('userNameInput').focus();
            return;
        }

        // Leave current room if any
        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = room;
        this.isConnected = true;

        // Update UI
        document.getElementById('currentRoomCode').textContent = `Room: ${room}`;
        document.getElementById('currentRoomCode').style.display = 'block';
        document.getElementById('chatTitle').textContent = `ChatFlow Pro - Room ${room}`;
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;

        // Clear previous messages and start fetching
        this.clearChatDisplay();
        this.startPolling();
        this.joinUserToRoom();

        this.showNotification(`Joined room ${room}`, 'success');
        document.getElementById('messageInput').focus();
    }

    /**
     * Join user to room on server
     */
    async joinUserToRoom() {
        try {
            await fetch('/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: this.currentRoom,
                    user: this.currentUser
                })
            });
        } catch (error) {
            console.error('Error joining room:', error);
            this.showConnectionError();
        }
    }

    /**
     * Leave current room
     */
    async leaveRoom() {
        if (!this.currentRoom) return;

        // Leave user from room on server
        try {
            await fetch('/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: this.currentRoom,
                    user: this.currentUser
                })
            });
        } catch (error) {
            console.error('Error leaving room:', error);
            this.showConnectionError();
        }

        this.stopPolling();
        this.currentRoom = '';
        this.isConnected = false;
        this.lastMessageCount = 0;

        // Update UI
        document.getElementById('currentRoomCode').style.display = 'none';
        document.getElementById('chatTitle').textContent = 'ChatFlow Pro';
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('messageInput').value = '';
        document.getElementById('roomInput').value = '';
        document.getElementById('typingIndicator').style.display = 'none';

        this.clearChatDisplay();
        this.clearOnlineUsers();
        this.showNotification('Left the room', 'info');
    }

    /**
     * Send a message
     */
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();

        if (!text || !this.currentRoom || !this.currentUser) return;

        try {
            const response = await fetch('/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: this.currentRoom,
                    sender: this.currentUser,
                    text: text
                })
            });

            if (response.ok) {
                messageInput.value = '';
                messageInput.style.height = 'auto';
                this.fetchMessages(); // Immediately fetch to show the sent message
            } else {
                this.showNotification('Failed to send message', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Network error', 'error');
        }
    }

    /**
     * Fetch messages from server
     */
    async fetchMessages() {
        if (!this.currentRoom) return;

        try {
            const response = await fetch(`/get/${this.currentRoom}`);
            const messages = await response.json();

            if (messages.length !== this.lastMessageCount) {
                this.displayMessages(messages);
                this.lastMessageCount = messages.length;
            }

            // Fetch online users
            this.fetchOnlineUsers();
            // Clear notification on success
            const notification = document.getElementById('notification');
            if (notification && notification.classList.contains('show')) {
                notification.className = 'notification';
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            this.showConnectionError();
        }
    }

    /**
     * Fetch online users
     */
    async fetchOnlineUsers() {
        if (!this.currentRoom) return;

        try {
            const response = await fetch(`/users/${this.currentRoom}`);
            const users = await response.json();
            this.displayOnlineUsers(users);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    /**
     * Display messages in chat
     */
    displayMessages(messages) {
        const container = document.getElementById('messagesContainer');
        const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;

        container.innerHTML = '';

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === this.currentUser ? 'own' : 'other'}`;

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = `message-bubble ${msg.sender === this.currentUser ? 'own' : 'other'}`;
            bubbleDiv.textContent = msg.text;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'message-info';
            infoDiv.textContent = `${msg.sender} • ${msg.time}`;

            messageDiv.appendChild(bubbleDiv);
            messageDiv.appendChild(infoDiv);
            container.appendChild(messageDiv);
        });

        if (shouldScroll) {
            this.scrollToBottom();
        }
    }

    /**
     * Display online users
     */
    displayOnlineUsers(users) {
        const userList = document.getElementById('onlineUsers');
        const userCount = document.getElementById('userCount');

        userCount.textContent = users.length;
        userList.innerHTML = '';

        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'online-user';

            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.textContent = user.charAt(0).toUpperCase();
            
            const colors = [
                'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
                'linear-gradient(45deg, #a8e6cf, #88d8c0)',
                'linear-gradient(45deg, #ffd93d, #ff6b6b)',
                'linear-gradient(45deg, #74b9ff, #0984e3)',
                'linear-gradient(45deg, #fd79a8, #e84393)'
            ];
            const colorIndex = user.charCodeAt(0) % colors.length;
            avatar.style.background = colors[colorIndex];

            const userName = document.createElement('span');
            userName.textContent = user;
            if (user === this.currentUser) {
                userName.textContent += ' (You)';
                userName.style.fontWeight = 'bold';
            }

            userDiv.appendChild(avatar);
            userDiv.appendChild(userName);
            userList.appendChild(userDiv);
        });
    }

    /**
     * Handle typing indicator
     */
    handleTyping() {
        if (!this.currentRoom) return;

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Send typing status
        fetch('/typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room: this.currentRoom,
                user: this.currentUser,
                typing: true
            })
        }).catch(console.error);

        // Stop typing after 2 seconds
        this.typingTimeout = setTimeout(() => {
            fetch('/typing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: this.currentRoom,
                    user: this.currentUser,
                    typing: false
                })
            }).catch(console.error);
        }, 2000);
    }

    /**
     * Start polling for messages
     */
    startPolling() {
        this.stopPolling();
        this.fetchMessages();
        this.pollingInterval = setInterval(() => {
            this.fetchMessages();
        }, 1000);
    }

    /**
     * Stop polling for messages
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        setInterval(() => {
            if (this.currentRoom) {
                this.lastActivity = Date.now();
            }
        }, 30000);
    }

    /**
     * Clear chat display
     */
    clearChatDisplay() {
        document.getElementById('messagesContainer').innerHTML = '';
    }

    /**
     * Clear chat history
     */
    clearChat() {
        if (!this.currentRoom) return;

        fetch(`/clear/${this.currentRoom}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                this.clearChatDisplay();
                this.showNotification('Chat cleared', 'success');
            }
        }).catch(error => {
            console.error('Error clearing chat:', error);
            this.showNotification('Failed to clear chat', 'error');
        });
    }

    /**
     * Clear online users display
     */
    clearOnlineUsers() {
        document.getElementById('onlineUsers').innerHTML = '';
        document.getElementById('userCount').textContent = '0';
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', persistent = false) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        if (!persistent) {
            setTimeout(() => {
                notification.className = 'notification';
            }, 3000);
        }
    }

    showConnectionError() {
        this.showNotification(
            "You are not connected. Please join the same Wi-Fi as the host, or use the public link with your mobile data if available.",
            "error",
            true
        );
    }
}

// Emoji functions
function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.style.display = picker.style.display === 'block' ? 'none' : 'block';
}

function addEmoji(emoji) {
    const messageInput = document.getElementById('messageInput');
    messageInput.value += emoji;
    messageInput.focus();
    document.getElementById('emojiPicker').style.display = 'none';
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
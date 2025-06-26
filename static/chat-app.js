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
        const roomCode = document.getElementById('roomCode').value.trim();
        if (!roomCode) {
            this.showNotification('Please enter a room code', 'error');
            return;
        }
        const jwt = localStorage.getItem('jwt');
        try {
            const res = await fetch('/join_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
                body: JSON.stringify({ room: roomCode })
            });
            const data = await res.json();
            if (res.ok) {
                this.currentRoom = roomCode;
                this.showNotification(`Joined room: ${roomCode}`, 'success');
                this.fetchMessages();
                this.fetchOnlineUsers();
                // Mark messages as read
                this.markMessagesAsRead();
                this.startPolling();
            } else {
                this.showNotification(data.error || 'Failed to join room', 'error');
            }
        } catch (err) {
            this.showNotification('Network error', 'error');
        }
    }

    /**
     * Join user to room on server
     */
    async joinUserToRoom(password) {
        try {
            const jwt = localStorage.getItem('jwt');
            const res = await fetch('/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
                body: JSON.stringify({
                    room: this.currentRoom,
                    user: this.currentUser,
                    password
                })
            });
            const data = await res.json();
            if (!res.ok) {
                this.showNotification(data.error || 'Failed to join room', 'error');
                return;
            }
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
            const jwt = localStorage.getItem('jwt');
            await fetch('/leave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
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
        if (!text) return;
        const jwt = localStorage.getItem('jwt');
        try {
            const res = await fetch(`${API_BASE_URL}/send_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
                body: JSON.stringify({ room: this.currentRoom, text })
            });
            if (res.ok) {
                messageInput.value = '';
                this.fetchMessages();
                // Check for mentions and notify
                const mentionPattern = /@(\w+)/g;
                const mentions = [];
                let match;
                while ((match = mentionPattern.exec(text)) !== null) {
                    mentions.push(match[1]);
                }
                if (mentions.length > 0) {
                    this.showNotification(`Mentioned: ${mentions.join(', ')}`, 'info');
                }
            } else {
                this.showNotification('Failed to send message', 'error');
            }
        } catch (err) {
            console.error('Error sending message:', err);
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

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';
            let avatarUrl = null;
            if (msg.sender === localStorage.getItem('username')) {
                avatarUrl = localStorage.getItem('avatar');
            }
            if (avatarUrl) {
                avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarDiv.textContent = msg.sender.charAt(0).toUpperCase();
            }

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = `message-bubble ${msg.sender === this.currentUser ? 'own' : 'other'}`;
            bubbleDiv.textContent = msg.text;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'message-info';
            infoDiv.textContent = `${msg.sender} • ${msg.time}`;

            messageDiv.appendChild(avatarDiv);
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

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';
            const avatarUrl = (user === localStorage.getItem('username')) ? localStorage.getItem('avatar') : null;
            if (avatarUrl) {
                avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarDiv.textContent = user.charAt(0).toUpperCase();
            }

            const userName = document.createElement('span');
            userName.textContent = user;
            if (user === this.currentUser) {
                userName.textContent += ' (You)';
                userName.style.fontWeight = 'bold';
            }

            userDiv.appendChild(avatarDiv);
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
        this.messagePolling = setInterval(() => {
            if (this.currentRoom) {
                this.fetchMessages();
                this.fetchOnlineUsers();
            }
        }, 2000);
        this.unreadPolling = setInterval(() => {
            this.updateUnreadCounts();
        }, 5000);
    }

    /**
     * Stop polling for messages
     */
    stopPolling() {
        if (this.messagePolling) {
            clearInterval(this.messagePolling);
            this.messagePolling = null;
        }
        if (this.unreadPolling) {
            clearInterval(this.unreadPolling);
            this.unreadPolling = null;
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

    async markMessagesAsRead() {
        if (!this.currentRoom) return;
        const jwt = localStorage.getItem('jwt');
        try {
            await fetch('/mark_read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
                body: JSON.stringify({ room: this.currentRoom })
            });
        } catch (err) {
            // Ignore
        }
    }

    async updateUnreadCounts() {
        const jwt = localStorage.getItem('jwt');
        try {
            const res = await fetch('/get_unread_count', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
                body: JSON.stringify({})
            });
            const unread_counts = await res.json();
            this.displayUnreadCounts(unread_counts);
        } catch (err) {
            // Ignore
        }
    }

    displayUnreadCounts(unread_counts) {
        // Update room list with unread counts
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            const roomName = item.getAttribute('data-room');
            const countBadge = item.querySelector('.unread-badge');
            const count = unread_counts[roomName] || 0;
            if (count > 0) {
                if (!countBadge) {
                    const badge = document.createElement('span');
                    badge.className = 'unread-badge';
                    badge.textContent = count;
                    item.appendChild(badge);
                } else {
                    countBadge.textContent = count;
                }
            } else if (countBadge) {
                countBadge.remove();
            }
        });
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

// Password show/hide toggle
window.togglePassword = function(inputId, el) {
    const input = document.getElementById(inputId);
    const icon = el.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Theme switcher logic
const themes = [
    { background: "#1A1A2E", color: "#FFFFFF", primaryColor: "#0F3460" },
    { background: "#461220", color: "#FFFFFF", primaryColor: "#E94560" },
    { background: "#192A51", color: "#FFFFFF", primaryColor: "#967AA1" },
    { background: "#F7B267", color: "#000000", primaryColor: "#F4845F" },
    { background: "#F25F5C", color: "#000000", primaryColor: "#642B36" },
    { background: "#231F20", color: "#FFF", primaryColor: "#BB4430" }
];
const setTheme = (theme) => {
    const root = document.querySelector(":root");
    root.style.setProperty("--background", theme.background);
    root.style.setProperty("--color", theme.color);
    root.style.setProperty("--primary-color", theme.primaryColor);
};
const displayThemeButtons = () => {
    const btnContainer = document.querySelector(".theme-btn-container");
    btnContainer.innerHTML = '';
    themes.forEach((theme) => {
        const div = document.createElement("div");
        div.className = "theme-btn";
        div.style.cssText = `background: ${theme.background}; width: 25px; height: 25px`;
        btnContainer.appendChild(div);
        div.addEventListener("click", () => setTheme(theme));
    });
};
displayThemeButtons();

// Glassmorphism modal logic

document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();

    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');
    const authTitle = document.getElementById('authTitle');
    const registerLink = document.getElementById('registerLink');
    const forgotLink = document.getElementById('forgotLink');

    function showAuthModal() {
        authModal.classList.add('show');
    }
    function hideAuthModal() {
        authModal.classList.remove('show');
    }
    function setAuthTab(tab) {
        if (tab === 'login') {
            authTitle.textContent = 'LOGIN';
            loginForm.style.display = '';
            signupForm.style.display = 'none';
        } else {
            authTitle.textContent = 'REGISTER';
            loginForm.style.display = 'none';
            signupForm.style.display = '';
        }
        clearAuthMessage();
    }
    function showAuthMessage(msg, type = 'error') {
        authMessage.textContent = msg;
        authMessage.className = 'auth-message' + (type === 'success' ? ' success' : '');
    }
    function clearAuthMessage() {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
    // Register/Forgot links
    registerLink.onclick = (e) => { e.preventDefault(); setAuthTab('register'); };
    forgotLink.onclick = (e) => { e.preventDefault(); showAuthMessage('Forgot password is not implemented yet.', 'error'); };

    // Show modal if not logged in
    function isLoggedIn() {
        return !!localStorage.getItem('jwt');
    }
    function logout() {
        localStorage.removeItem('jwt');
        localStorage.removeItem('username');
        localStorage.removeItem('avatar');
        showAuthModal();
        document.getElementById('userName').textContent = 'Anonymous';
        document.getElementById('userAvatar').textContent = 'U';
        updateSidebarAvatar();
    }
    window.logout = logout;

    if (!isLoggedIn()) {
        showAuthModal();
    }

    // Login form submit
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        clearAuthMessage();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('jwt', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('avatar', data.avatar || '');
                hideAuthModal();
                document.getElementById('userName').textContent = data.username;
                document.getElementById('userAvatar').textContent = data.username.charAt(0).toUpperCase();
                showAuthMessage('Login successful!', 'success');
                updateSidebarAvatar();
            } else {
                showAuthMessage(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            showAuthMessage('Network error', 'error');
        }
    };

    // Signup form submit
    signupForm.onsubmit = async (e) => {
        e.preventDefault();
        clearAuthMessage();
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const avatar = document.getElementById('signupAvatar').value.trim();
        try {
            const res = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, avatar })
            });
            const data = await res.json();
            if (res.ok) {
                showAuthMessage('Registration successful! Please log in.', 'success');
                setAuthTab('login');
                updateSidebarAvatar();
            } else {
                showAuthMessage(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            showAuthMessage('Network error', 'error');
        }
    };

    // Hide chat UI until logged in
    if (!isLoggedIn()) {
        document.querySelector('.app-container').style.display = 'none';
    }
    function showChatUI() {
        document.querySelector('.app-container').style.display = '';
    }
    if (isLoggedIn()) {
        showChatUI();
    }
    const observer = new MutationObserver(() => {
        if (!authModal.classList.contains('show')) {
            showChatUI();
        }
    });
    observer.observe(authModal, { attributes: true });

    // Room creation and listing logic
    const createRoomBtn = document.getElementById('createRoomBtn');
    const createRoomName = document.getElementById('createRoomName');
    const createRoomPassword = document.getElementById('createRoomPassword');
    const roomListDiv = document.getElementById('roomList');
    const joinRoomPassword = document.getElementById('joinRoomPassword');

    async function fetchRooms() {
        const jwt = localStorage.getItem('jwt');
        if (!jwt) return;
        try {
            const res = await fetch('/rooms', {
                headers: { 'Authorization': jwt }
            });
            const rooms = await res.json();
            displayRoomList(rooms);
        } catch (err) {
            // ignore
        }
    }

    function displayRoomList(rooms) {
        roomListDiv.innerHTML = '';
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.textContent = room.name + (room.has_password ? ' 🔒' : '');
            div.onclick = () => {
                document.getElementById('roomInput').value = room.name;
                joinRoomPassword.value = '';
                chatApp.joinRoom();
            };
            roomListDiv.appendChild(div);
        });
    }

    if (createRoomBtn) {
        createRoomBtn.onclick = async () => {
            const name = createRoomName.value.trim();
            const password = createRoomPassword.value;
            if (!name) {
                showNotification('Room name required', 'error');
                return;
            }
            const jwt = localStorage.getItem('jwt');
            try {
                const res = await fetch('/create_room', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': jwt
                    },
                    body: JSON.stringify({ name, password })
                });
                const data = await res.json();
                if (res.ok) {
                    showNotification('Room created!', 'success');
                    createRoomName.value = '';
                    createRoomPassword.value = '';
                    fetchRooms();
                } else {
                    showNotification(data.error || 'Failed to create room', 'error');
                }
            } catch (err) {
                showNotification('Network error', 'error');
            }
        };
    }

    // Fetch rooms on load and after login
    if (localStorage.getItem('jwt')) {
        fetchRooms();
    }
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && localStorage.getItem('jwt')) fetchRooms();
    });

    // Refetch rooms after creating or joining
    setInterval(() => {
        if (localStorage.getItem('jwt')) fetchRooms();
    }, 10000);
});

// Helper to get avatar URL or fallback
function getAvatarForUser(username) {
    // Current user: use localStorage
    if (username === localStorage.getItem('username')) {
        const avatar = localStorage.getItem('avatar');
        if (avatar) return avatar;
    }
    // For others: fallback to letter (could be extended to fetch from backend)
    return null;
}

// Patch sidebar avatar update on login/signup
function updateSidebarAvatar() {
    const avatarDiv = document.getElementById('userAvatar');
    const username = localStorage.getItem('username');
    const avatarUrl = localStorage.getItem('avatar');
    if (avatarUrl) {
        avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else if (username) {
        avatarDiv.textContent = username.charAt(0).toUpperCase();
    } else {
        avatarDiv.textContent = 'U';
    }
}

// --- DM logic ---
let activeDM = null; // username of DM target, or null for room chat

let allKnownUsers = new Set();
let onlineUserSet = new Set();

// Poll online users and update status
async function pollOnlineUsers() {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return;
    try {
        const res = await fetch('/online_users', { headers: { 'Authorization': jwt } });
        const online = await res.json();
        onlineUserSet = new Set(online);
        // Update UI
        if (window.chatApp && window.chatApp.onlineUsers) {
            window.chatApp.displayOnlineUsers(Array.from(window.chatApp.onlineUsers));
        }
        renderDMList(window.chatApp && window.chatApp.onlineUsers ? Array.from(window.chatApp.onlineUsers) : []);
    } catch (err) {}
}
setInterval(pollOnlineUsers, 5000);

// Send heartbeat
setInterval(() => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return;
    fetch('/heartbeat', { method: 'POST', headers: { 'Authorization': jwt } });
}, 10000);

// Helper to check if current user is room admin
function isRoomAdmin(room) {
    const jwt = localStorage.getItem('jwt');
    if (!jwt || !room) return false;
    // We'll fetch the room list and check creator
    // For now, store the last fetched room list
    return window.lastRoomList && window.lastRoomList.find(r => r.name === room && r.creator === localStorage.getItem('username'));
}

// Fetch and cache room list for admin checks
async function fetchRoomsAndCache() {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return;
    try {
        const res = await fetch('/rooms', { headers: { 'Authorization': jwt } });
        const rooms = await res.json();
        window.lastRoomList = rooms;
    } catch (err) {}
}
setInterval(fetchRoomsAndCache, 10000);
fetchRoomsAndCache();

// Patch displayOnlineUsers to show admin controls
const origDisplayOnlineUsers3 = ChatApp.prototype.displayOnlineUsers;
ChatApp.prototype.displayOnlineUsers = function(users) {
    origDisplayOnlineUsers3.call(this, users);
    const userList = document.getElementById('onlineUsers');
    const currentRoom = this.currentRoom;
    if (isRoomAdmin(currentRoom)) {
        Array.from(userList.children).forEach((userDiv, i) => {
            const user = users[i];
            if (user === localStorage.getItem('username')) return;
            // Add kick/ban buttons if not already present
            if (!userDiv.querySelector('.kick-btn')) {
                const kickBtn = document.createElement('button');
                kickBtn.className = 'kick-btn action-btn';
                kickBtn.textContent = 'Kick';
                kickBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await adminAction('kick_user', currentRoom, user);
                };
                userDiv.appendChild(kickBtn);
            }
            if (!userDiv.querySelector('.ban-btn')) {
                const banBtn = document.createElement('button');
                banBtn.className = 'ban-btn action-btn';
                banBtn.textContent = 'Ban';
                banBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await adminAction('ban_user', currentRoom, user);
                };
                userDiv.appendChild(banBtn);
            }
        });
    }
    renderDMList(users);
};

async function adminAction(endpoint, room, user) {
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch(`/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({ room, user })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification(`${endpoint === 'kick_user' ? 'Kicked' : 'Banned'} ${user}`, 'success');
            chatApp.fetchMessages();
        } else {
            showNotification(data.error || 'Action failed', 'error');
        }
    } catch (err) {
        showNotification('Network error', 'error');
    }
}

// Patch displayMessages to add edit/delete buttons for own messages
const origDisplayMessages2 = ChatApp.prototype.displayMessages;
ChatApp.prototype.displayMessages = function(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    // Show pinned messages at the top
    if (this.currentRoom) {
        fetch(`/get_pins/${this.currentRoom}`, {
            headers: { 'Authorization': localStorage.getItem('jwt') }
        })
        .then(res => res.json())
        .then(pins => {
            if (pins && pins.length) {
                const pinHeader = document.createElement('div');
                pinHeader.textContent = '📌 Pinned Messages:';
                pinHeader.style.fontWeight = 'bold';
                pinHeader.style.marginBottom = '8px';
                container.appendChild(pinHeader);
                pins.forEach(msg => {
                    const pinDiv = document.createElement('div');
                    pinDiv.className = 'message pinned';
                    pinDiv.textContent = `${msg.sender}: ${msg.text} (${msg.time})`;
                    container.appendChild(pinDiv);
                });
            }
            renderMessagesWithEditDelete(messages, container, this.currentRoom);
        });
        return;
    }
    renderMessagesWithEditDelete(messages, container, this.currentRoom);
};

const REACTION_EMOJIS = ['👍', '😂', '❤️', '🔥', '🎉', '😮', '😢', '😡'];

function renderMessagesWithEditDelete(messages, container, room) {
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender === localStorage.getItem('username') ? 'own' : 'other'}`;
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        let avatarUrl = null;
        if (msg.sender === localStorage.getItem('username')) {
            avatarUrl = localStorage.getItem('avatar');
        }
        if (avatarUrl) {
            avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarDiv.textContent = msg.sender.charAt(0).toUpperCase();
        }
        // Message bubble with mention highlighting and file support
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `message-bubble ${msg.sender === localStorage.getItem('username') ? 'own' : 'other'}`;
        bubbleDiv.innerHTML = highlightMentions(msg.text);
        
        // Add file display if present
        if (msg.file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-attachment';
            const ext = msg.file.filename.split('.').pop().toLowerCase();
            if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
                // Image preview
                fileDiv.innerHTML = `
                    <img src="${msg.file.url}" alt="${msg.file.filename}" class="file-preview" onclick="window.open('${msg.file.url}', '_blank')">
                    <div class="file-info">
                        <a href="${msg.file.url}" download="${msg.file.filename}" class="file-download">
                            <i class="fas fa-download"></i> ${msg.file.filename}
                        </a>
                    </div>
                `;
            } else {
                // File download link
                fileDiv.innerHTML = `
                    <div class="file-info">
                        <a href="${msg.file.url}" download="${msg.file.filename}" class="file-download">
                            <i class="fas fa-file"></i> ${msg.file.filename}
                        </a>
                        <span class="file-size">${formatFileSize(msg.file.size)}</span>
                    </div>
                `;
            }
            bubbleDiv.appendChild(fileDiv);
        }
        
        // Info with read receipts
        const infoDiv = document.createElement('div');
        infoDiv.className = 'message-info';
        infoDiv.textContent = `${msg.sender} • ${msg.time}`;
        // Read receipts for own messages
        if (msg.sender === localStorage.getItem('username')) {
            const readReceipt = document.createElement('div');
            readReceipt.className = 'read-receipt';
            readReceipt.innerHTML = getReadReceiptText(msg.read_by || []);
            infoDiv.appendChild(readReceipt);
        }
        // Reactions
        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'reactions';
        REACTION_EMOJIS.forEach(emoji => {
            const count = msg.reactions && msg.reactions[emoji] ? msg.reactions[emoji].length : 0;
            const reacted = msg.reactions && msg.reactions[emoji] && msg.reactions[emoji].includes(localStorage.getItem('username'));
            const btn = document.createElement('button');
            btn.className = 'reaction-btn' + (reacted ? ' reacted' : '');
            btn.textContent = emoji + (count > 0 ? ` ${count}` : '');
            btn.onclick = async () => {
                await reactToMessage(msg, emoji, room);
            };
            reactionsDiv.appendChild(btn);
        });
        // Layout
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(infoDiv);
        messageDiv.appendChild(reactionsDiv);
        // Edit/Delete for own messages
        if (msg.sender === localStorage.getItem('username')) {
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn action-btn';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => startEditMessage(msg, bubbleDiv, room);
            messageDiv.appendChild(editBtn);
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn action-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteMessage(msg, room);
            messageDiv.appendChild(deleteBtn);
        }
        // Reply button
        const replyBtn = document.createElement('button');
        replyBtn.className = 'reply-btn action-btn';
        replyBtn.textContent = 'Reply';
        replyBtn.onclick = () => showReplyInput(msg, messageDiv, room);
        messageDiv.appendChild(replyBtn);
        // Replies container
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies-container';
        repliesContainer.style.marginLeft = '40px';
        fetchAndRenderReplies(msg, repliesContainer, room);
        messageDiv.appendChild(repliesContainer);
        container.appendChild(messageDiv);
        // Mark message as read if not own message
        if (msg.sender !== localStorage.getItem('username')) {
            markMessageAsRead(msg.id);
        }
    });
    container.scrollTop = container.scrollHeight;
}

function getReadReceiptText(readBy) {
    const currentUser = localStorage.getItem('username');
    const otherReaders = readBy.filter(user => user !== currentUser);
    if (otherReaders.length === 0) {
        return '<span class="read-status">Sent</span>';
    } else if (otherReaders.length === 1) {
        return `<span class="read-status">Read by ${otherReaders[0]}</span>`;
    } else {
        return `<span class="read-status">Read by ${otherReaders.length} people</span>`;
    }
}

async function markMessageAsRead(messageId) {
    const jwt = localStorage.getItem('jwt');
    try {
        await fetch('/mark_message_read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({ message_id: messageId })
        });
    } catch (err) {
        // Ignore
    }
}

function highlightMentions(text) {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

async function fetchAndRenderReplies(msg, repliesContainer, room) {
    repliesContainer.innerHTML = '';
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch('/get_replies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({ room, id: msg.id })
        });
        const replies = await res.json();
        if (Array.isArray(replies)) {
            replies.forEach(reply => {
                const replyDiv = document.createElement('div');
                replyDiv.className = 'reply-message';
                replyDiv.innerHTML = `<b>${reply.sender}</b>: ${reply.text} <span class='reply-time'>${reply.time}</span>`;
                repliesContainer.appendChild(replyDiv);
            });
        }
    } catch (err) {
        // Ignore
    }
}

function showReplyInput(msg, messageDiv, room) {
    // Prevent multiple reply inputs
    if (messageDiv.querySelector('.reply-input')) return;
    const inputDiv = document.createElement('div');
    inputDiv.className = 'reply-input';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Write a reply...';
    input.style.width = '70%';
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.onclick = async () => {
        const text = input.value.trim();
        if (!text) return;
        const jwt = localStorage.getItem('jwt');
        try {
            const res = await fetch('/reply_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt
                },
                body: JSON.stringify({ room, id: msg.id, text })
            });
            if (res.ok) {
                input.value = '';
                // Refresh replies
                const repliesContainer = messageDiv.querySelector('.replies-container');
                fetchAndRenderReplies(msg, repliesContainer, room);
            }
        } catch (err) {}
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') sendBtn.onclick();
        if (e.key === 'Escape') inputDiv.remove();
    };
    inputDiv.appendChild(input);
    inputDiv.appendChild(sendBtn);
    messageDiv.appendChild(inputDiv);
    input.focus();
}

// Patch renderDMList to show online/offline
function renderDMList(onlineUsers) {
    const dmList = document.getElementById('dmList');
    const currentUser = localStorage.getItem('username');
    dmList.innerHTML = '';
    const allUsers = Array.from(new Set([...allKnownUsers, ...onlineUsers])).filter(u => u !== currentUser);
    allUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'dm-user' + (activeDM === user ? ' active' : '');
        // Status dot
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.style.display = 'inline-block';
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.marginRight = '8px';
        dot.style.background = onlineUserSet.has(user) ? '#4ecdc4' : '#bdc3c7';
        userDiv.appendChild(dot);
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        const avatarUrl = (user === localStorage.getItem('username')) ? localStorage.getItem('avatar') : null;
        if (avatarUrl) {
            avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarDiv.textContent = user.charAt(0).toUpperCase();
        }
        // Name
        const userName = document.createElement('span');
        userName.textContent = user;
        userDiv.appendChild(avatarDiv);
        userDiv.appendChild(userName);
        userDiv.onclick = () => {
            activeDM = user;
            renderDMList(onlineUsers);
            showDM(user);
        };
        dmList.appendChild(userDiv);
    });
}

async function showDM(user) {
    // Update chat header
    document.getElementById('chatTitle').textContent = `DM with ${user}`;
    document.getElementById('currentRoomCode').style.display = 'none';
    // Fetch DM messages
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch(`/get_dm/${user}`, {
            headers: { 'Authorization': jwt }
        });
        const messages = await res.json();
        renderDMMessages(messages, user);
    } catch (err) {
        showNotification('Failed to load DMs', 'error');
    }
}

function renderDMMessages(messages, user) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender === localStorage.getItem('username') ? 'own' : 'other'}`;
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        let avatarUrl = null;
        if (msg.sender === localStorage.getItem('username')) {
            avatarUrl = localStorage.getItem('avatar');
        }
        if (avatarUrl) {
            avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarDiv.textContent = msg.sender.charAt(0).toUpperCase();
        }
        // Message bubble
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `message-bubble ${msg.sender === localStorage.getItem('username') ? 'own' : 'other'}`;
        bubbleDiv.textContent = msg.text;
        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'message-info';
        infoDiv.textContent = `${msg.sender} • ${msg.time}`;
        // Layout
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(infoDiv);
        container.appendChild(messageDiv);
    });
    container.scrollTop = container.scrollHeight;
    // Enable message input
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    // Change send button to send DM
    document.getElementById('sendBtn').onclick = () => sendDM(user);
}

async function sendDM(user) {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch('/send_dm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({ to: user, text })
        });
        if (res.ok) {
            input.value = '';
            showDM(user);
        } else {
            showNotification('Failed to send DM', 'error');
        }
    } catch (err) {
        showNotification('Network error', 'error');
    }
}

// Add a button to switch back to room chat
function addBackToRoomButton() {
    const chatHeader = document.querySelector('.chat-header .chat-title');
    if (!document.getElementById('backToRoomBtn')) {
        const btn = document.createElement('button');
        btn.id = 'backToRoomBtn';
        btn.className = 'action-btn';
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Room';
        btn.onclick = () => {
            activeDM = null;
            document.getElementById('chatTitle').textContent = 'ChatFlow Pro';
            document.getElementById('currentRoomCode').style.display = 'block';
            document.getElementById('sendBtn').onclick = () => chatApp.sendMessage();
            chatApp.fetchMessages();
            renderDMList(chatApp.onlineUsers ? Array.from(chatApp.onlineUsers) : []);
            btn.remove();
        };
        chatHeader.appendChild(btn);
    }
}

// Poll for DMs if a DM is open
setInterval(() => {
    if (activeDM) showDM(activeDM);
}, 2000);

// Add mentions tab to sidebar
function addMentionsTab() {
    const sidebar = document.querySelector('.sidebar');
    const mentionsTab = document.createElement('div');
    mentionsTab.className = 'sidebar-tab';
    mentionsTab.id = 'mentionsTab';
    mentionsTab.innerHTML = '<i class="fas fa-at"></i> Mentions';
    mentionsTab.onclick = () => showMentions();
    sidebar.appendChild(mentionsTab);
}

async function showMentions() {
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch('/get_mentions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({})
        });
        const mentions = await res.json();
        displayMentions(mentions);
    } catch (err) {
        showNotification('Failed to fetch mentions', 'error');
    }
}

function displayMentions(mentions) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    if (mentions.length === 0) {
        container.innerHTML = '<div class="no-mentions">No mentions found</div>';
        return;
    }
    mentions.forEach(mention => {
        const mentionDiv = document.createElement('div');
        mentionDiv.className = 'mention-item';
        mentionDiv.innerHTML = `
            <div class="mention-room">${mention.room}</div>
            <div class="mention-message">${highlightMentions(mention.message.text)}</div>
            <div class="mention-info">by ${mention.message.sender} at ${mention.message.time}</div>
        `;
        mentionDiv.onclick = () => {
            this.currentRoom = mention.room;
            document.getElementById('roomCode').value = mention.room;
            this.joinRoom();
        };
        container.appendChild(mentionDiv);
    });
}

// Add mod logs button for admins
function addModLogsButton() {
    const chatHeader = document.querySelector('.chat-header');
    const modLogsBtn = document.createElement('button');
    modLogsBtn.className = 'mod-logs-btn';
    modLogsBtn.innerHTML = '<i class="fas fa-history"></i> Mod Logs';
    modLogsBtn.onclick = () => showModLogs();
    chatHeader.appendChild(modLogsBtn);
}

async function showModLogs() {
    if (!this.currentRoom || !isRoomAdmin(this.currentRoom, localStorage.getItem('username'))) {
        showNotification('Only admins can view mod logs', 'error');
        return;
    }
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch('/get_mod_logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({ room: this.currentRoom })
        });
        const logs = await res.json();
        displayModLogs(logs);
    } catch (err) {
        showNotification('Failed to fetch mod logs', 'error');
    }
}

function displayModLogs(logs) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Moderation Logs - ${this.currentRoom}</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="mod-logs-container">
                    ${logs.length === 0 ? '<p>No moderation actions yet</p>' : ''}
                    ${logs.map(log => `
                        <div class="mod-log-entry">
                            <div class="mod-log-header">
                                <span class="mod-action ${log.action}">${log.action.toUpperCase()}</span>
                                <span class="mod-timestamp">${log.timestamp}</span>
                            </div>
                            <div class="mod-details">
                                <strong>${log.admin}</strong> ${getActionText(log.action)} <strong>${log.target}</strong>
                                ${log.details ? `<div class="mod-details-text">${log.details}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function getActionText(action) {
    const actionTexts = {
        'kick': 'kicked',
        'ban': 'banned',
        'pin': 'pinned message',
        'delete': 'deleted message'
    };
    return actionTexts[action] || action;
}

// Add file upload UI
function addFileUploadUI() {
    const messageInput = document.getElementById('messageInput');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    fileInput.style.display = 'none';
    fileInput.accept = '.txt,.pdf,.png,.jpg,.jpeg,.gif,.doc,.docx';
    fileInput.onchange = handleFileSelect;
    
    const fileBtn = document.createElement('button');
    fileBtn.type = 'button';
    fileBtn.className = 'file-btn';
    fileBtn.innerHTML = '<i class="fas fa-paperclip"></i>';
    fileBtn.onclick = () => fileInput.click();
    
    const inputContainer = messageInput.parentElement;
    inputContainer.insertBefore(fileBtn, messageInput);
    inputContainer.appendChild(fileInput);
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File too large (max 5MB)', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch('/upload_file', {
            method: 'POST',
            headers: {
                'Authorization': jwt
            },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            // Send message with file
            await sendMessageWithFile(data);
        } else {
            showNotification(data.error || 'Upload failed', 'error');
        }
    } catch (err) {
        showNotification('Upload failed', 'error');
    }
    event.target.value = '';
}

async function sendMessageWithFile(fileData) {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    const jwt = localStorage.getItem('jwt');
    try {
        const res = await fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwt
            },
            body: JSON.stringify({ 
                room: this.currentRoom, 
                text: text || `Shared file: ${fileData.filename}`,
                file: fileData
            })
        });
        if (res.ok) {
            messageInput.value = '';
            this.fetchMessages();
        } else {
            showNotification('Failed to send file', 'error');
        }
    } catch (err) {
        showNotification('Network error', 'error');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5050' 
    : 'https://your-backend-domain.onrender.com'; // Replace with your Render domain
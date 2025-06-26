// Utility functions for ChatFlow Pro
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function showNotification(message, type = 'info', persistent = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    if (!persistent) {
        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }
}

// Basic emoji picker logic
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    if (picker) {
        picker.style.display = picker.style.display === 'block' ? 'none' : 'block';
    }
}

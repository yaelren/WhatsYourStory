document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('wordInput');
    const sendButton = document.getElementById('sendButton');
    const status = document.getElementById('status');
    const previousText = document.getElementById('previousText');

    // Configuration
    const MAX_VISIBLE_WORDS = 10; // Number of words to show
    let storyWords = [];

    // Function to load initial story
    async function loadStory() {
        try {
            const response = await fetch('/story');
            const data = await response.json();
            if (data.story) {
                storyWords = data.story.split(' ');
                updateVisibleStory();
            }
        } catch (error) {
            console.error('Error loading story:', error);
        }
    }

    // Function to update visible story text
    function updateVisibleStory() {
        const lastWords = storyWords.slice(-MAX_VISIBLE_WORDS);
        previousText.textContent = lastWords.join(' ');
        
        // Add ellipsis if we have more words than visible
        if (storyWords.length > MAX_VISIBLE_WORDS) {
            previousText.textContent = '... ' + previousText.textContent;
        }
    }

    // Function to show status messages
    function showStatus(message, isError = false) {
        status.textContent = message;
        status.style.display = 'block';
        status.className = isError ? 'error' : 'success';
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    // Function to handle word submission
    async function submitWord() {
        const word = wordInput.value.trim();
        
        if (!word) {
            showStatus('Please enter a word', true);
            return;
        }

        sendButton.disabled = true;
        
        try {
            const response = await fetch('/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'story_word',
                    word: word,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showStatus('Word sent successfully!');
                // Add new word to our story array
                storyWords.push(word);
                // Update the visible text
                updateVisibleStory();
                wordInput.value = ''; // Clear input
            } else {
                showStatus('Failed to send word', true);
            }
        } catch (error) {
            console.error('Error:', error);
            showStatus('Error sending word', true);
        } finally {
            sendButton.disabled = false;
            wordInput.focus(); // Focus back on input for next word
        }
    }

    // Event listeners
    sendButton.addEventListener('click', submitWord);
    
    // Allow submitting with Enter key
    wordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            submitWord();
        }
    });

    // Load initial story and set up the page
    loadStory().then(() => {
        wordInput.focus();
    });
}); 
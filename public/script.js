document.addEventListener('DOMContentLoaded', () => {
    const nextWords = document.getElementById('nextWords');
    const sendButton = document.getElementById('sendButton');
    const storyContainer = document.getElementById('storyContainer');
    const userName = document.getElementById('userName');

    const COLORS = [
        '(247,197,251)',  // Pink
        '(30,86,195)',    // Blue
        '(126,62,45)',    // Brown
        '(209,230,209)'   // Mint
    ];

    let currentColor = null;  // Store the current color

    // Function to get a random color from our palette
    function getRandomColor() {
        const randomIndex = Math.floor(Math.random() * COLORS.length);
        return COLORS[randomIndex];
    }

    // Function to update background color when typing
    function handleTyping(event) {
        // Skip if it's a special key (arrows, delete, etc)
        if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'ArrowLeft' || 
            event.key === 'ArrowRight' || event.key === 'Tab') {
            return;
        }

        const currentText = nextWords.value;
        const futureText = currentText + event.key;
        
        // Count spaces in current text
        const spaceCount = (currentText.match(/\s/g) || []).length;
        
        // If we already have 3 spaces (4 words) and trying to add a space, prevent it
        if (spaceCount >= 3 && event.key === ' ') {
            event.preventDefault();
            return;
        }

        // Set background color if typing starts and we don't have a color
        if (!currentColor && futureText.trim().length > 0) {
            currentColor = getRandomColor();
            nextWords.style.backgroundColor = `rgb${currentColor}`;
        }
    }

    // Function to handle background color clearing
    function handleInputChange() {
        if (nextWords.value.trim().length === 0) {
            currentColor = null;
            nextWords.style.backgroundColor = '';
        }
    }

    // Configuration
    const MAX_VISIBLE_WORDS = 7; // Number of words to show
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
        storyContainer.textContent = lastWords.join(' ');
        
        // Add ellipsis if we have more words than visible
        if (storyWords.length > MAX_VISIBLE_WORDS) {
            storyContainer.textContent = '... ' + storyContainer.textContent;
        }
    }

    // Function to count words in a string
    function countWords(str) {
        return str.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // Function to animate word submission
    async function animateWordSubmission() {
        // Animate the input flying up and out
        await gsap.to(nextWords, {
            y: -10000,
            opacity: 1,
            duration: 2,
            ease: "circ.in"
        });

        // Reset the input position and opacity
        gsap.set(nextWords, {
            y: 0,
            opacity: 1
        });
    }

    // Function to handle word submission
    async function submitWord() {
        const word = nextWords.value.trim().toLowerCase(); // Story words in lowercase
        
        // Check word count (1-4 words)
        const wordCount = countWords(word);
        if (wordCount < 1 || wordCount > 4) {
            return;
        }

        // Check name length (max 3 words)
        const name = userName.value.trim().toUpperCase(); // Username in uppercase
        const nameWordCount = countWords(name);
        if (nameWordCount > 3) {
            return;
        }

        if (!word || !name) {
            return;
        }

        sendButton.disabled = true;
        
        try {
            const color = currentColor || getRandomColor();
            const response = await fetch('/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    word: word,
                    color: color,
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await animateWordSubmission();

                // Add new word to our story array
                storyWords.push(word);
                // Update the visible text
                updateVisibleStory();
                
                // Reset the input and its styles
                nextWords.value = '';
                userName.value = '';
                currentColor = null;
                nextWords.style.backgroundColor = '';
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            sendButton.disabled = false;
            nextWords.focus();
        }
    }

    // Event listeners
    sendButton.addEventListener('click', submitWord);
    nextWords.addEventListener('keydown', handleTyping);
    nextWords.addEventListener('input', handleInputChange);
    
    // Allow submitting with Enter key
    nextWords.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            submitWord();
        }
    });

    // Load initial story and set up the page
    loadStory().then(() => {
        nextWords.focus();
    });
}); 
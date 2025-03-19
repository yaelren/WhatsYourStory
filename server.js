const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const TD_HOST = process.env.TD_HOST || '127.0.0.1';
const TD_PORT = process.env.TD_PORT || 7000;

// Story file path
const STORY_FILE = path.join(__dirname, 'story.txt');

// Initialize story file if it doesn't exist
if (!fs.existsSync(STORY_FILE)) {
    fs.writeFileSync(STORY_FILE, 'Once upon a time in a distant galaxy...\n');
}

// Create UDP client
const udpClient = dgram.createSocket('udp4');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serve static files from 'public' directory

// Serve the HTML interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get current story
app.get('/story', (req, res) => {
    try {
        const story = fs.readFileSync(STORY_FILE, 'utf8');
        res.json({ story: story.trim() });
    } catch (error) {
        console.error('Error reading story file:', error);
        res.status(500).json({ error: 'Failed to read story' });
    }
});

// Main endpoint to receive data and forward to TouchDesigner
app.post('/data', (req, res) => {
    try {
        const word = req.body.word;
        if (!word) {
            res.status(400).json({ error: 'No word provided' });
            return;
        }

        // Append word to story file
        fs.appendFileSync(STORY_FILE, ' ' + word);
        
        // Read updated story
        const fullStory = fs.readFileSync(STORY_FILE, 'utf8');
        
        // Prepare data for TouchDesigner
        const data = JSON.stringify({
            type: 'story_word',
            word: word,
            fullStory: fullStory.trim(),
            timestamp: new Date().toISOString()
        });
        
        // Send data to TouchDesigner via UDP
        udpClient.send(data, TD_PORT, TD_HOST, (error) => {
            if (error) {
                console.error('Error sending UDP message:', error);
                res.status(500).json({ error: 'Failed to send data to TouchDesigner' });
            } else {
                console.log('Data sent to TouchDesigner:', data);
                res.json({ 
                    success: true, 
                    message: 'Data forwarded to TouchDesigner',
                    story: fullStory.trim()
                });
            }
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug ping endpoint
app.get('/ping', (req, res) => {
    const testMessage = JSON.stringify({
        type: "debug_ping",
        timestamp: new Date().toISOString(),
        message: "Hello TouchDesigner!"
    });

    udpClient.send(testMessage, TD_PORT, TD_HOST, (error) => {
        if (error) {
            console.error('Ping failed:', error);
            res.status(500).json({ error: 'Failed to ping TouchDesigner' });
        } else {
            console.log('Ping sent:', testMessage);
            res.json({ success: true, message: 'Ping sent to TouchDesigner' });
        }
    });
});

// Error handling for UDP client
udpClient.on('error', (error) => {
    console.error('UDP Client Error:', error);
});

// Start server - listen on all network interfaces
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`Access locally at http://localhost:${port}`);
    console.log(`Sending UDP messages to TouchDesigner at ${TD_HOST}:${TD_PORT}`);
    console.log(`Story is being saved to: ${STORY_FILE}`);
}); 
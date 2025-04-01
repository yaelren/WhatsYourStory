const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// Function to get IP addresses cross-platform
function getIPAddresses(callback) {
    try {
        const networkInterfaces = os.networkInterfaces();
        const ips = [];
        
        Object.values(networkInterfaces).forEach(interfaces => {
            interfaces.forEach(interface => {
                // Only get IPv4 addresses and skip internal interfaces
                if (interface.family === 'IPv4' && !interface.internal) {
                    ips.push({
                        address: interface.address,
                        netmask: interface.netmask,
                        broadcast: interface.broadcast || null, // broadcast might not exist on all platforms
                        isRecommended: interface.address.startsWith('192.168')
                    });
                }
            });
        });
        
        callback(ips);
    } catch (error) {
        console.error(`Error getting IP addresses: ${error}`);
        callback([]);
    }
}

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const TD_HOST = process.env.TD_HOST || '127.0.0.1';
const TD_PORT = process.env.TD_PORT || 7000;

// Opening lines for each day
const openingLines = {
    0: "In the kingdom of Wix",
    1: "I am greatful for...",
    2: "Our Wix journey begins when",
    3: "What I love about Wix is",
    4: "I always knew that Wix",
    5: "In the kingdom of Wix",
    6: "In the kingdom of Wix"
};

// Add this function near the top of the file
function getCurrentStoryFile() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return {
        storyFile: path.join(__dirname, `story_${todayStr}.txt`),
        authorsFile: path.join(__dirname, `authors_${todayStr}.txt`),
        weekday: today.getDay()
    };
    // return {
    //     storyFile: path.join( 'G:/Shared drives/Studio_Video_2025/00280 What\'s Your Story/Stories', `story_${todayStr}.txt`),
    //     authorsFile: path.join( 'G:/Shared drives/Studio_Video_2025/00280 What\'s Your Story/Stories', `authors_${todayStr}.txt`),
    //     weekday: today.getDay()
    // };
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
        const { storyFile, authorsFile, weekday } = getCurrentStoryFile();
        
        // Check if the file exists, if not create it with the opening line
        if (!fs.existsSync(storyFile)) {
            const index = weekday === 0 ? 0 : weekday;
            fs.writeFileSync(storyFile, ``);
            fs.writeFileSync(authorsFile, ``);
        }
        
        const story = fs.readFileSync(storyFile, 'utf8');
        res.json({ story: story.trim() });
    } catch (error) {
        console.error('Error reading story file:', error);
        res.status(500).json({ error: 'Failed to read story' });
    }
});

// Main endpoint to receive data and forward to TouchDesigner
app.post('/data', (req, res) => {
    try {
        const { storyFile, authorsFile } = getCurrentStoryFile();
        const word = req.body.word;
        const name = req.body.name;
        const color = req.body.color;
        
        if (!word) {
            res.status(400).json({ error: 'No word provided' });
            return;
        }

        // Ensure the files exist before appending
        if (!fs.existsSync(storyFile)) {
            const { weekday } = getCurrentStoryFile();
            const index = weekday === 0 ? 0 : weekday;
            fs.writeFileSync(storyFile, `${openingLines[index]}`);
            fs.writeFileSync(authorsFile, ``);
        }

        // Append word to story file
        fs.appendFileSync(storyFile, ' ,\n' + word);
        
        // Append name to authors file
        fs.appendFileSync(authorsFile, name + '      ');
        
        // Read updated story
        const fullStory = fs.readFileSync(storyFile, 'utf8');
        
        // Prepare data for TouchDesigner
        const data = JSON.stringify({
            name: name,
            word: word,
            color: color, // Forward the color to TouchDesigner
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
    getIPAddresses((ipAddresses) => {
        const recommendedIP = ipAddresses.find(ip => ip.isRecommended);
        
        console.log('\n=== Story Server Started ===');
        console.log('\n📱 Connect to the Story UI:');
        console.log('------------------------');
        if (recommendedIP) {
            console.log('\n✨ RECOMMENDED CONNECTION:');
            console.log(`http://${recommendedIP.address}:${port}`);
        }
        
        console.log('\nAll available addresses:');
        console.log('------------------------');
        console.log(`Local computer:  http://localhost:${port}`);
        ipAddresses.forEach(ip => {
            if (!ip.isRecommended) {
                console.log(`Other network: http://${ip.address}:${port}`);
            }
        });
        
        console.log('\n🎨 TouchDesigner Connection:');
        console.log('------------------------');
        console.log(`UDP Host: ${TD_HOST}`);
        console.log(`UDP Port: ${TD_PORT}`);
        
        console.log('\n📄 Story File Location:');
        console.log('------------------------');
        // console.log(`${storyFile}\n`);
    });
}); 
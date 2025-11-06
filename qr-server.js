const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3000;
const SAVE_DIR = './qr_chunks';

// Create save directory if it doesn't exist
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    console.log(`✅ Created directory: ${SAVE_DIR}`);
}

const server = http.createServer((req, res) => {
    // Enable CORS for browser access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Save chunk endpoint
    if (req.method === 'POST' && req.url === '/save-chunk') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { chunkIndex, content, fileName } = data;

                // Save to file
                const chunkFileName = `chunk_${String(chunkIndex).padStart(4, '0')}.txt`;
                const filePath = path.join(SAVE_DIR, chunkFileName);

                fs.writeFileSync(filePath, content, 'utf8');

                console.log(`✓ Saved: ${chunkFileName} (for ${fileName})`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, saved: chunkFileName }));
            } catch (error) {
                console.error('❌ Error saving chunk:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });

        return;
    }

    // Get stats endpoint
    if (req.method === 'GET' && req.url === '/stats') {
        try {
            const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.txt'));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                chunksCount: files.length,
                saveDir: SAVE_DIR
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }

        return;
    }

    // Clear all chunks endpoint
    if (req.method === 'POST' && req.url === '/clear') {
        try {
            const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.txt'));
            files.forEach(file => {
                fs.unlinkSync(path.join(SAVE_DIR, file));
            });

            console.log(`🗑️  Cleared ${files.length} chunks`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, cleared: files.length }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }

        return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
            <head><title>QR Server</title></head>
            <body>
                <h1>QR Code Chunk Server</h1>
                <p>✅ Server is running</p>
                <p>📁 Saving to: ${SAVE_DIR}</p>
                <p>Use with webcam-scanner-v3.html</p>
            </body>
            </html>
        `);
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log('QR Code Chunk Server');
    console.log('====================\n');
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📁 Saving chunks to: ${path.resolve(SAVE_DIR)}\n`);
    console.log('Usage:');
    console.log('  1. Keep this server running');
    console.log('  2. Open webcam-scanner-v3.html in your browser');
    console.log('  3. Chunks will be saved directly to disk\n');
    console.log('Press Ctrl+C to stop\n');
});

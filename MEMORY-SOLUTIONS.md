# Memory Management Solutions for QR Scanning

Two solutions to prevent browser memory issues when scanning large files:

## Solution 1: Auto-Save with webcam-scanner-v2.html ✅ (Already Implemented)

**What it does:**
- Automatically downloads a backup ZIP every 100 chunks
- Keeps scanning without interruption
- Files saved with timestamp: `qr_backup_2000_chunks_1234567890.zip`

**How to use:**
1. Open `webcam-scanner-v2.html`
2. Start scanning
3. Every 100 chunks, a ZIP will auto-download
4. After finishing, merge all ZIPs:
   ```bash
   node merge-zips.js --filter "filename.docx" backup1.zip backup2.zip backup3.zip
   ```

**Pros:**
- No server needed
- Works immediately
- Automatic backups

**Cons:**
- Still uses browser memory
- Multiple ZIP files to manage
- Browser may block multiple downloads

---

## Solution 2: Server Mode with qr-server.js ✅ NEW!

**What it does:**
- Saves each chunk directly to disk as it's scanned
- Uses minimal browser memory (only tracking, not storing data)
- All chunks saved to `./qr_chunks/` folder

**How to use:**

### Step 1: Start the server
```bash
node qr-server.js
```

You'll see:
```
QR Code Chunk Server
====================

✅ Server running at http://localhost:3000
📁 Saving chunks to: C:\Users\ofek\Downloads\sand\qr_chunks
```

### Step 2: Open the scanner
Open `webcam-scanner-v3.html` in your browser

### Step 3: Scan QR codes
- Each chunk saves instantly to disk
- Status shows: "✓ SAVED TO DISK: Chunk X / Y"
- Memory usage stays low

### Step 4: Reconstruct the file
```bash
node text-to-file.js ./qr_chunks
```

**Pros:**
- ✅ Minimal memory usage
- ✅ Real-time disk saving
- ✅ No ZIP management needed
- ✅ Can scan unlimited chunks
- ✅ Perfect for huge files (10,000+ chunks)

**Cons:**
- Requires Node.js server running
- Must keep terminal open

---

## Comparison

| Feature | Solution 1 (Auto-Save) | Solution 2 (Server) |
|---------|----------------------|---------------------|
| Memory Usage | High (stores all) | Low (only tracks) |
| Setup | None | Start server |
| Best For | Small-medium files | Large files (10k+ chunks) |
| File Management | Multiple ZIPs | Single folder |
| Browser Only | Yes | No (needs server) |

---

## Recommendation for Your Case

Since you have **12,252 chunks** (large file), I recommend:

**Use Solution 2 (Server Mode)**

1. Open two terminals:
   - Terminal 1: `node qr-server.js`
   - Terminal 2: Keep available for commands

2. Open `webcam-scanner-v3.html` in browser

3. Scan all QR codes (they save to `./qr_chunks/` instantly)

4. When done:
   ```bash
   node text-to-file.js ./qr_chunks
   ```

This will handle your large file without any memory issues!

---

## Files Created

- `webcam-scanner-v2.html` - Auto-save mode (already updated)
- `webcam-scanner-v3.html` - Server mode (NEW)
- `qr-server.js` - Local server for saving chunks (NEW)
- `merge-zips.js` - Merge multiple ZIPs (already updated)
- `diagnose-zips.js` - Diagnose ZIP contents (already created)

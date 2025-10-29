# QR Code to File Transfer System

A system for transferring files between air-gapped computers using QR codes and a webcam.

## Project Files

### Core Tools

1. **webcam-scanner-v2.html** - Browser-based QR Code Scanner
   - Real-time webcam scanning with visual feedback
   - FPS counter and scan attempt tracking
   - Progress bar showing scanned vs missing chunks
   - Auto-download as ZIP file when complete
   - No installation required - runs in any modern browser

2. **text-to-file.js** - QR Data to File Reconstructor
   - Automatically extracts ZIP files from webcam scanner
   - Reads and validates all QR data chunks
   - Reconstructs original file from base64-encoded data
   - Supports all file formats (PDF, Word, Excel, images, videos, etc.)
   - Detects missing chunks and provides recovery options

3. **qr-to-excel.js** - QR Code Image to File Reconstructor
   - Reads QR codes from image files (PNG, JPG)
   - Enhanced image processing with multiple techniques
   - Fallback for when webcam scanning isn't available
   - Requires: `jimp`, `jsqr` packages

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/QR-Tools.git
cd QR-Tools

# Install dependencies
npm install
```

### Method 1: Webcam Scanner (Recommended)

**Step 1: Scan QR Codes**

1. Open `webcam-scanner-v2.html` in your web browser (Chrome/Edge recommended)
2. Click "Start Camera" and allow camera access
3. Point your webcam at QR codes displayed on another screen
4. Watch for the pulsing green indicator and incrementing scan counter
5. Monitor the progress bar as you scan each code
6. When complete (100%), click "Download All Text Files (.zip)"

**Step 2: Reconstruct the File**

```bash
# Option 1: Automatic (recommended)
node text-to-file.js "path/to/qr_text_data.zip"

# Option 2: If ZIP is in current directory
node text-to-file.js
```

Your reconstructed file will be saved to `./reconstructed_files/`

### Method 2: QR Code Images (Fallback)

If you have QR codes as image files:

```bash
# Place all QR code images in ./qr_codes/ folder
node qr-to-excel.js
```

## Advanced Usage

### text-to-file.js Options

```bash
# Use a custom directory with extracted text files
node text-to-file.js ./my_custom_folder

# Allow partial reconstruction (if some chunks are missing)
node text-to-file.js --partial

# Combine options
node text-to-file.js ./my_folder --partial
```

### qr-to-excel.js Options

```bash
# Use custom QR images directory
node qr-to-excel.js ./my_qr_images

# Allow partial reconstruction
node qr-to-excel.js --partial

# Specify custom directory with partial flag
node qr-to-excel.js ./my_qr_images --partial
```

## How It Works

### Data Flow

```
Source Computer (with QR codes displayed)
    ↓
Webcam Scanner (webcam-scanner-v2.html)
    → Scans QR codes in real-time
    → Saves raw text data for each chunk
    → Downloads as qr_text_data.zip
    ↓
Reconstruction Script (text-to-file.js or qr-to-excel.js)
    → Extracts ZIP (if needed)
    → Reads all chunks
    → Validates chunk order and completeness
    → Combines base64 data
    → Converts back to binary
    → Saves original file
    ↓
Reconstructed File (in ./reconstructed_files/)
```

### QR Code Data Format

Each QR code contains data in this format:
```
filename.pdf|~|0|~|10|~|base64encodeddata...
│            │  │   │   └─ Base64 encoded file chunk
│            │  │   └───── Total number of chunks
│            │  └───────── Current chunk index (0-based)
│            └──────────── Original filename with extension
```

The delimiter `|~|` separates the metadata from the actual file data.

## Supported File Types

All file types are supported:
- Documents (PDF, Word, Excel, PowerPoint)
- Images (PNG, JPG, GIF, etc.)
- Videos (MP4, AVI, etc.)
- Archives (ZIP, RAR, etc.)
- Any other binary file

## Troubleshooting

### Webcam Scanner Issues

**Camera not starting?**
1. Ensure you allowed camera permissions in your browser
2. Check if another application is using the webcam
3. Try a different browser (Chrome/Edge recommended)

**Not seeing scan activity?**
1. Press **F12** to open browser console for debugging logs
2. Check if "Scans: XX" counter is incrementing (should be 10-30+ per second)
3. Check if "FPS: XX" shows a value greater than 0
4. If counters are frozen, reload the page and restart camera

**QR codes not being detected?**
1. Ensure good lighting on the QR code display
2. Hold the webcam steady and adjust distance (try 20-40cm away)
3. Make sure QR codes are clearly visible and in focus
4. Check browser console for "[QR DETECTED]" messages

### Reconstruction Issues

**Missing chunks error?**

The script will show exactly which chunks are missing:
```
❌ Missing chunks: 5, 12, 34, 67
```

Options to fix:
1. Rescan the missing QR codes with the webcam scanner
2. Use `--partial` flag to reconstruct anyway (file may be corrupted)

**ZIP extraction failed?**

Make sure dependencies are installed:
```bash
npm install
```

**File is corrupted after reconstruction?**

This usually means some chunks are missing or were scanned incorrectly:
1. Check the console output for missing chunks
2. Rescan all QR codes if many chunks failed
3. Try using `qr-to-excel.js` with QR code images as a fallback

## Requirements

### System Requirements
- Node.js (v12 or higher)
- Modern web browser with webcam support (Chrome, Edge, Firefox)
- Working webcam

### npm Dependencies

Installed automatically via `npm install`:
- `adm-zip` - ZIP file extraction for text-to-file.js
- `jimp` - Image processing for qr-to-excel.js
- `jsqr` - QR code decoding for qr-to-excel.js

Browser-based (loaded via CDN in webcam-scanner-v2.html):
- `jsQR` - QR code decoding
- `JSZip` - ZIP file creation

## Use Cases

- **Air-gapped systems**: Transfer files between computers that cannot be connected
- **Security-sensitive environments**: Transfer files without network or physical media
- **Quick file sharing**: Share files by displaying QR codes on screen
- **Backup/recovery**: Store file data as QR codes for archival purposes
- **Cross-platform transfer**: Works on any system with Node.js and a webcam

## License

MIT License - feel free to use and modify for your needs.

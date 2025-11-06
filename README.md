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

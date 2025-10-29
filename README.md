# QR Code to File Transfer System

A system for transferring files between air-gapped computers using QR codes and a webcam.

## Files

- **webcam-scanner-v2.html** - Webcam-based QR code scanner (open in browser)
- **text-to-file.js** - Reconstructs files from scanned QR data
- **qr-to-excel.js** - Original QR to Excel reconstructor (for reference)

## Quick Start

### Step 1: Scan QR Codes

1. Open `webcam-scanner-v2.html` in your web browser
2. Click "Start Camera" and allow camera access
3. Point your webcam at QR codes displayed on another screen
4. Watch the progress bar fill up as you scan each code
5. When complete, click "Download All Text Files (.zip)"

### Step 2: Reconstruct the File

Simply run:

```bash
node text-to-file.js
```

The script will:
- ✅ Automatically detect and extract `qr_text_data.zip` if present
- ✅ Read all text files containing QR data
- ✅ Reconstruct the original file
- ✅ Save to `./reconstructed_files/`

## Advanced Usage

### Specify ZIP file directly:

```bash
node text-to-file.js qr_text_data.zip
```

### Specify a folder:

```bash
node text-to-file.js ./my_custom_folder
```

### Allow partial reconstruction (if some chunks are missing):

```bash
node text-to-file.js --partial
```

## How It Works

1. **Source Computer**: QR codes contain file data in this format:
   ```
   filename.pdf|~|0|~|10|~|base64data...
   ```

2. **Webcam Scanner**: Captures QR codes and saves the raw text data

3. **Reconstruction**: Combines all chunks in order and converts back to the original file

## Supported File Types

All file types are supported:
- Documents (PDF, Word, Excel, PowerPoint)
- Images (PNG, JPG, GIF, etc.)
- Videos (MP4, AVI, etc.)
- Archives (ZIP, RAR, etc.)
- Any other binary file

## Troubleshooting

### Webcam scanner not working?

1. Make sure you allowed camera access
2. Press **F12** to open browser console and check for errors
3. Look for the "Scans: XX" and "FPS: XX" counters - they should increment rapidly
4. Try a different browser (Chrome/Edge recommended)

### Missing chunks?

The script will tell you which chunks are missing. Options:
1. Rescan the missing QR codes
2. Use `--partial` flag to create a partial file (may be corrupted)

### ZIP extraction issues?

Make sure you have `adm-zip` installed:
```bash
npm install
```

## Requirements

- Node.js
- npm packages: `adm-zip`, `jsqr`, `jszip` (for webcam scanner)

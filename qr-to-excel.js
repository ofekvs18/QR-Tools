const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const jsQR = require('jsqr');

// Configuration
const QR_IMAGES_DIR = './qr_codes';
const OUTPUT_DIR = './reconstructed_files';
const DELIMITER = '|~|';

async function readQRCodeEnhanced(imagePath) {
    try {
        const image = await Jimp.read(imagePath);
        
        // Try multiple image processing techniques
        const techniques = [
            { name: 'original', img: image.clone() },
            { name: 'brightness', img: image.clone().brightness(0.2) },
            { name: 'contrast', img: image.clone().contrast(0.3) },
            { name: 'normalized', img: image.clone().normalize() },
            { name: 'grayscale', img: image.clone().grayscale().contrast(0.2) },
        ];
        
        for (const tech of techniques) {
            const imageData = {
                data: new Uint8ClampedArray(tech.img.bitmap.data),
                width: tech.img.bitmap.width,
                height: tech.img.bitmap.height
            };
            
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
            });
            
            if (code) {
                const parts = code.data.split(DELIMITER);
                
                if (parts.length === 4) {
                    return {
                        fileName: parts[0],
                        chunkIndex: parseInt(parts[1], 10),
                        totalChunks: parseInt(parts[2], 10),
                        data: parts[3],
                        technique: tech.name
                    };
                }
            }
        }
        
        throw new Error('Could not decode QR code with any technique');
    } catch (error) {
        throw new Error(`Failed to read ${imagePath}: ${error.message}`);
    }
}

async function qrToExcel(qrImagesDir = QR_IMAGES_DIR, allowPartial = false) {
    try {
        // Check if directory exists
        if (!fs.existsSync(qrImagesDir)) {
            console.error(`❌ Directory not found: ${qrImagesDir}`);
            process.exit(1);
        }
        
        // Get all QR code images
        const files = fs.readdirSync(qrImagesDir)
            .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
            .sort();
        
        if (files.length === 0) {
            console.error('❌ No image files found in directory');
            process.exit(1);
        }
        
        console.log(`Found ${files.length} image files\n`);
        
        // Read all QR codes
        const chunks = [];
        const failedFiles = [];
        let fileName = '';
        let totalChunks = 0;
        
        for (const file of files) {
            const filePath = path.join(qrImagesDir, file);
            process.stdout.write(`Reading: ${file}... `);
            
            try {
                const qrData = await readQRCodeEnhanced(filePath);
                
                if (!fileName) {
                    fileName = qrData.fileName;
                    totalChunks = qrData.totalChunks;
                    console.log(`\n\nFile to reconstruct: ${fileName}`);
                    console.log(`Expected chunks: ${totalChunks}\n`);
                }
                
                chunks.push({
                    index: qrData.chunkIndex,
                    data: qrData.data,
                    fileName: qrData.fileName,
                    technique: qrData.technique
                });
                
                console.log(`✓ (chunk ${qrData.chunkIndex}, method: ${qrData.technique})`);
            } catch (error) {
                console.log(`✗ FAILED`);
                failedFiles.push({ file, error: error.message });
            }
        }
        
        // Sort chunks by index
        chunks.sort((a, b) => a.index - b.index);
        
        // Remove duplicates (keep first occurrence)
        const uniqueChunks = [];
        const seenIndices = new Set();
        for (const chunk of chunks) {
            if (!seenIndices.has(chunk.index)) {
                uniqueChunks.push(chunk);
                seenIndices.add(chunk.index);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Successfully decoded: ${uniqueChunks.length}/${totalChunks || files.length}`);
        console.log(`   Failed: ${failedFiles.length}`);
        
        if (failedFiles.length > 0) {
            console.log('\n⚠️  Failed files:');
            failedFiles.forEach(f => console.log(`   - ${f.file}`));
        }
        
        // Check if we have all chunks
        const missingChunks = [];
        if (totalChunks > 0) {
            for (let i = 0; i < totalChunks; i++) {
                if (!seenIndices.has(i)) {
                    missingChunks.push(i);
                }
            }
        }
        
        if (missingChunks.length > 0) {
            console.log(`\n❌ Missing chunks: ${missingChunks.join(', ')}`);
            
            if (allowPartial) {
                console.log('\n⚠️  Proceeding with PARTIAL reconstruction (file will be corrupted)');
            } else {
                console.log('\n💡 Options:');
                console.log('   1. Rescan missing QR codes');
                console.log('   2. Use diagnostic tool: node qr-diagnostic.js diagnose qr_codes/qr_XXXX.png');
                console.log('   3. Regenerate missing chunks from original Excel file');
                console.log('   4. Run with --partial flag to create corrupted file anyway');
                process.exit(1);
            }
        }
        
        // Combine all data
        const base64Data = uniqueChunks.map(c => c.data).join('');
        
        // Convert base64 back to binary
        let fileBuffer;
        try {
            fileBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('\n❌ Failed to decode base64 data. File is corrupted.');
            process.exit(1);
        }
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        // Save the reconstructed file
        const suffix = missingChunks.length > 0 ? '_PARTIAL' : '';
        const outputFileName = fileName.replace(/(\.[^.]+)$/, `${suffix}$1`);
        const outputPath = path.join(OUTPUT_DIR, outputFileName);
        fs.writeFileSync(outputPath, fileBuffer);
        
        console.log(`\n✅ File saved: ${outputPath}`);
        console.log(`   Size: ${fileBuffer.length} bytes`);
        
        if (missingChunks.length > 0) {
            console.log('\n⚠️  WARNING: File is incomplete and may be corrupted!');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    let qrDir = QR_IMAGES_DIR;
    let allowPartial = false;
    
    // Parse arguments
    args.forEach(arg => {
        if (arg === '--partial') {
            allowPartial = true;
        } else if (!arg.startsWith('--')) {
            qrDir = arg;
        }
    });
    
    console.log('QR Code to Excel Reconstructor (Enhanced)');
    console.log('==========================================\n');
    console.log(`Reading from: ${qrDir}`);
    console.log(`Partial reconstruction: ${allowPartial ? 'ENABLED' : 'DISABLED'}\n`);
    
    qrToExcel(qrDir, allowPartial);
}

module.exports = { qrToExcel };
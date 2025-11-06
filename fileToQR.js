const fs = require('fs');
const QRCode = require('qrcode');
const path = require('path');

// Configuration - SMALLER chunks for better reliability
const CHUNK_SIZE = 800; // Reduced from 2600 for more reliable QR codes
const OUTPUT_DIR = './qr_codes';
const DELIMITER = '|~|';

async function excelToQRCodes(excelFilePath) {
    try {
        // Read the Excel file as binary
        const fileBuffer = fs.readFileSync(excelFilePath);
        const base64Data = fileBuffer.toString('base64');
        
        // Get original filename
        const fileName = path.basename(excelFilePath);
        
        // Calculate number of chunks needed
        const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
        
        console.log(`File size: ${fileBuffer.length} bytes`);
        console.log(`Base64 size: ${base64Data.length} bytes`);
        console.log(`Total QR codes needed: ${totalChunks}`);
        console.log(`Chunk size: ${CHUNK_SIZE} bytes (more reliable)\n`);
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        let successCount = 0;
        let failCount = 0;
        const failedChunks = [];
        
        // Generate QR codes for each chunk
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, base64Data.length);
            const chunk = base64Data.slice(start, end);
            
            // Create compact format
            const qrData = `${fileName}${DELIMITER}${i}${DELIMITER}${totalChunks}${DELIMITER}${chunk}`;
            
            // Generate QR code with retry logic
            const qrFilePath = path.join(OUTPUT_DIR, `qr_${String(i).padStart(4, '0')}.png`);
            
            let success = false;
            
            // Try with increasing error correction if needed
            const errorLevels = ['L', 'M'];
            for (const level of errorLevels) {
                try {
                    await QRCode.toFile(qrFilePath, qrData, {
                        errorCorrectionLevel: level,
                        type: 'png',
                        quality: 1.0,
                        margin: 2,
                        width: 1200, // Larger for better scanning
                        scale: 4
                    });
                    
                    success = true;
                    successCount++;
                    console.log(`✓ Generated: ${path.basename(qrFilePath)} (${i + 1}/${totalChunks}) [${level}]`);
                    break;
                } catch (error) {
                    if (level === 'M') {
                        console.error(`✗ FAILED: ${path.basename(qrFilePath)} - ${error.message}`);
                        failCount++;
                        failedChunks.push(i);
                    }
                }
            }
        }
        
        // Create an index file with instructions
        const indexContent = `
Excel to QR Code Transfer (Ultra Reliable Version)
==================================================
File: ${fileName}
Total QR Codes: ${totalChunks}
Successfully Generated: ${successCount}
Failed: ${failCount}
Original Size: ${fileBuffer.length} bytes
Chunk Size: ${CHUNK_SIZE} bytes (optimized for reliability)

${failedChunks.length > 0 ? `FAILED CHUNKS: ${failedChunks.join(', ')}\nYou may need to regenerate these separately.\n` : ''}

Instructions:
1. Scan all QR codes in order (qr_0000.png to qr_${String(totalChunks - 1).padStart(4, '0')}.png)
2. Save the scanned images with their original names
3. Run qr-to-excel-reliable.js to reconstruct the file

Generated on: ${new Date().toISOString()}
        `;
        
        fs.writeFileSync(path.join(OUTPUT_DIR, 'README.txt'), indexContent);
        
        if (failCount === 0) {
            console.log('\n✅ Perfect! All QR codes generated successfully!');
        } else {
            console.log(`\n⚠️  ${failCount} QR codes failed to generate`);
            console.log('Failed chunks:', failedChunks.join(', '));
            console.log('\nUse qr-diagnostic.js to regenerate failed chunks:');
            failedChunks.forEach(chunk => {
                console.log(`  node qr-diagnostic.js regenerate "${excelFilePath}" ${chunk}`);
            });
        }
        
        console.log('\n📁 QR codes location:', OUTPUT_DIR);
        console.log('📝 Check README.txt for details');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node excel-to-qr-reliable.js <path-to-excel-file>');
        console.log('Example: node excel-to-qr-reliable.js myfile.xlsx');
        process.exit(1);
    }
    
    const excelFile = args[0];
    
    if (!fs.existsSync(excelFile)) {
        console.error(`❌ File not found: ${excelFile}`);
        process.exit(1);
    }
    
    console.log('Excel to QR - Ultra Reliable Version');
    console.log('====================================\n');
    
    excelToQRCodes(excelFile);
}

module.exports = { excelToQRCodes };
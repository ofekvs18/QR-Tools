const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Configuration
const TEXT_FILES_DIR = './qr_text_data';
const OUTPUT_DIR = './reconstructed_files';
const DELIMITER = '|~|';

async function extractZipIfNeeded(inputPath) {
    // Check if input is a ZIP file
    if (inputPath.endsWith('.zip') && fs.existsSync(inputPath)) {
        // Extract to a folder with the same name (without .zip)
        const extractDir = inputPath.replace(/\.zip$/i, '');

        console.log(`📦 Found ZIP file: ${inputPath}`);
        console.log(`📂 Extracting to: ${extractDir}\n`);

        try {
            const zip = new AdmZip(inputPath);
            zip.extractAllTo(extractDir, true);
            console.log(`✅ Extracted successfully!\n`);
            return extractDir; // Return the extracted directory path
        } catch (error) {
            console.error(`❌ Failed to extract ZIP: ${error.message}`);
            return null;
        }
    }

    // Check if it's a directory that exists
    if (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) {
        // Directory exists, check if there's a zip file we should extract
        const zipInDir = path.join(inputPath, 'qr_text_data.zip');
        if (fs.existsSync(zipInDir)) {
            console.log(`📦 Found ZIP file inside directory: ${zipInDir}`);
            console.log(`📂 Extracting...\n`);

            try {
                const zip = new AdmZip(zipInDir);
                zip.extractAllTo(inputPath, true);
                console.log(`✅ Extracted successfully!\n`);
            } catch (error) {
                console.error(`❌ Failed to extract ZIP: ${error.message}`);
            }
        }
        return inputPath;
    }

    // Directory doesn't exist, check for .zip version
    const zipPath = inputPath + '.zip';
    if (fs.existsSync(zipPath)) {
        console.log(`📦 Found ZIP file: ${zipPath}`);
        console.log(`📂 Extracting to: ${inputPath}\n`);

        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(inputPath, true);
            console.log(`✅ Extracted successfully!\n`);
            return inputPath;
        } catch (error) {
            console.error(`❌ Failed to extract ZIP: ${error.message}`);
            return null;
        }
    }

    // Check for default qr_text_data.zip in current directory
    const defaultZip = './qr_text_data.zip';
    if (fs.existsSync(defaultZip) && inputPath === TEXT_FILES_DIR) {
        console.log(`📦 Found ZIP file: ${defaultZip}`);
        console.log(`📂 Extracting to: ${inputPath}\n`);

        try {
            const zip = new AdmZip(defaultZip);
            zip.extractAllTo(inputPath, true);
            console.log(`✅ Extracted successfully!\n`);
            return inputPath;
        } catch (error) {
            console.error(`❌ Failed to extract ZIP: ${error.message}`);
            return null;
        }
    }

    return inputPath;
}

function readQRDataFromText(textFilePath) {
    try {
        const content = fs.readFileSync(textFilePath, 'utf8').trim();

        // Parse the QR data format: fileName|~|chunkIndex|~|totalChunks|~|base64Data
        const parts = content.split(DELIMITER);

        if (parts.length === 4) {
            return {
                fileName: parts[0],
                chunkIndex: parseInt(parts[1], 10),
                totalChunks: parseInt(parts[2], 10),
                data: parts[3]
            };
        } else {
            throw new Error(`Invalid format: expected 4 parts, got ${parts.length}`);
        }
    } catch (error) {
        throw new Error(`Failed to read ${textFilePath}: ${error.message}`);
    }
}

async function textToFile(textFilesDir = TEXT_FILES_DIR, allowPartial = false) {
    try {
        // Try to extract ZIP if needed
        const actualDir = await extractZipIfNeeded(textFilesDir);

        if (!actualDir) {
            console.error(`❌ Failed to process input: ${textFilesDir}`);
            process.exit(1);
        }

        // Use the actual directory (might be different if we extracted a ZIP)
        textFilesDir = actualDir;

        // Check if directory exists
        if (!fs.existsSync(textFilesDir)) {
            console.error(`❌ Directory not found: ${textFilesDir}`);
            console.error(`💡 Make sure you have either:`);
            console.error(`   - A folder: ${textFilesDir}`);
            console.error(`   - A ZIP file: ${textFilesDir}.zip`);
            console.error(`   - Or qr_text_data.zip in the current directory`);
            process.exit(1);
        }

        // Get all text files
        const files = fs.readdirSync(textFilesDir)
            .filter(f => f.match(/\.txt$/i))
            .sort();

        if (files.length === 0) {
            console.error('❌ No text files found in directory');
            process.exit(1);
        }

        console.log(`Found ${files.length} text files\n`);

        // Read all QR data from text files
        const chunks = [];
        const failedFiles = [];
        let fileName = '';
        let totalChunks = 0;

        for (const file of files) {
            const filePath = path.join(textFilesDir, file);
            process.stdout.write(`Reading: ${file}... `);

            try {
                const qrData = readQRDataFromText(filePath);

                if (!fileName) {
                    fileName = qrData.fileName;
                    totalChunks = qrData.totalChunks;
                    console.log(`\n\nFile to reconstruct: ${fileName}`);
                    console.log(`Expected chunks: ${totalChunks}\n`);
                }

                chunks.push({
                    index: qrData.chunkIndex,
                    data: qrData.data,
                    fileName: qrData.fileName
                });

                console.log(`✓ (chunk ${qrData.chunkIndex})`);
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
                console.log('   1. Find missing text files with QR data');
                console.log('   2. Regenerate missing chunks from original file');
                console.log('   3. Run with --partial flag to create corrupted file anyway');
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

    let textDir = TEXT_FILES_DIR;
    let allowPartial = false;

    // Parse arguments
    args.forEach(arg => {
        if (arg === '--partial') {
            allowPartial = true;
        } else if (!arg.startsWith('--')) {
            textDir = arg;
        }
    });

    console.log('Text QR Data to File Reconstructor');
    console.log('===================================\n');
    console.log(`Reading from: ${textDir}`);
    console.log(`Partial reconstruction: ${allowPartial ? 'ENABLED' : 'DISABLED'}\n`);

    textToFile(textDir, allowPartial).catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}

module.exports = { textToFile };
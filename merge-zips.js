const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Configuration
const OUTPUT_DIR = './reconstructed_files';
const DELIMITER = '|~|';

async function mergeZipsAndReconstruct(zipFiles, filterFileName = null) {
    console.log('QR ZIP Merger & File Reconstructor');
    console.log('===================================\n');

    if (zipFiles.length === 0) {
        console.error('❌ No ZIP files provided');
        console.log('\nUsage:');
        console.log('  node merge-zips.js file1.zip file2.zip file3.zip ...');
        console.log('  node merge-zips.js --filter "filename.docx" file1.zip file2.zip ...');
        console.log('  OR place all ZIPs in current directory and run: node merge-zips.js');
        process.exit(1);
    }

    if (filterFileName) {
        console.log(`🔍 Filtering for file: ${filterFileName}\n`);
    }

    const allChunks = new Map();
    let expectedFileName = null;
    let expectedTotalChunks = 0;

    // Process each ZIP file
    for (const zipPath of zipFiles) {
        if (!fs.existsSync(zipPath)) {
            console.log(`⚠️  File not found: ${zipPath} (skipping)`);
            continue;
        }

        console.log(`📦 Processing: ${zipPath}`);

        try {
            const zip = new AdmZip(zipPath);
            const zipEntries = zip.getEntries();

            let chunkCount = 0;
            for (const entry of zipEntries) {
                if (entry.entryName.endsWith('.txt') && !entry.isDirectory) {
                    const content = entry.getData().toString('utf8').trim();
                    const parts = content.split(DELIMITER);

                    if (parts.length === 4) {
                        const fileName = parts[0];
                        const chunkIndex = parseInt(parts[1], 10);
                        const totalChunks = parseInt(parts[2], 10);
                        const data = parts[3];

                        // Skip if filtering and this isn't the file we want
                        if (filterFileName && fileName !== filterFileName) {
                            continue;
                        }

                        // Set expected values from first valid chunk
                        if (!expectedFileName) {
                            expectedFileName = fileName;
                            expectedTotalChunks = totalChunks;
                            console.log(`   File: ${expectedFileName}`);
                            console.log(`   Expected chunks: ${expectedTotalChunks}\n`);
                        }

                        // Add chunk if we don't have it yet
                        if (!allChunks.has(chunkIndex)) {
                            allChunks.set(chunkIndex, data);
                            chunkCount++;
                        }
                    }
                }
            }

            console.log(`   ✓ Extracted ${chunkCount} new chunks\n`);
        } catch (error) {
            console.log(`   ✗ Failed to read ZIP: ${error.message}\n`);
        }
    }

    console.log('📊 Merge Summary:');
    console.log(`   Total unique chunks: ${allChunks.size}`);
    console.log(`   Expected chunks: ${expectedTotalChunks}`);
    console.log(`   Progress: ${((allChunks.size / expectedTotalChunks) * 100).toFixed(1)}%\n`);

    // Check for missing chunks
    const missingChunks = [];
    for (let i = 0; i < expectedTotalChunks; i++) {
        if (!allChunks.has(i)) {
            missingChunks.push(i);
        }
    }

    if (missingChunks.length > 0) {
        console.log(`❌ Missing ${missingChunks.length} chunks:\n`);

        if (missingChunks.length <= 50) {
            console.log(`   ${missingChunks.join(', ')}\n`);
        } else {
            console.log(`   First 50: ${missingChunks.slice(0, 50).join(', ')}...`);
            console.log(`   ...and ${missingChunks.length - 50} more\n`);
        }

        console.log('💡 Options:');
        console.log('   1. Scan the missing QR codes and add another ZIP');
        console.log('   2. Run with --partial flag to create corrupted file anyway:');
        console.log('      node merge-zips.js --partial file1.zip file2.zip ...\n');

        if (!process.argv.includes('--partial')) {
            process.exit(1);
        } else {
            console.log('⚠️  Proceeding with PARTIAL reconstruction (file will be corrupted)\n');
        }
    }

    // Reconstruct the file
    console.log('🔄 Reconstructing file...');

    // Combine chunks in order
    const sortedChunks = [];
    for (let i = 0; i < expectedTotalChunks; i++) {
        if (allChunks.has(i)) {
            sortedChunks.push(allChunks.get(i));
        } else if (process.argv.includes('--partial')) {
            // For partial reconstruction, add empty data for missing chunks
            sortedChunks.push('');
        }
    }

    const base64Data = sortedChunks.join('');

    // Convert base64 to binary
    let fileBuffer;
    try {
        fileBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
        console.error('\n❌ Failed to decode base64 data. File is corrupted.');
        process.exit(1);
    }

    // Create output directory if needed
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Save the reconstructed file
    const suffix = missingChunks.length > 0 ? '_PARTIAL' : '';
    const outputFileName = expectedFileName.replace(/(\.[^.]+)$/, `${suffix}$1`);
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    fs.writeFileSync(outputPath, fileBuffer);

    console.log(`\n✅ File saved: ${outputPath}`);
    console.log(`   Size: ${fileBuffer.length.toLocaleString()} bytes`);

    if (missingChunks.length > 0) {
        console.log('\n⚠️  WARNING: File is incomplete and may be corrupted!');
    } else {
        console.log('\n🎉 File successfully reconstructed!');
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    // Parse --filter argument
    let filterFileName = null;
    const filterIndex = args.indexOf('--filter');
    if (filterIndex !== -1 && args[filterIndex + 1]) {
        filterFileName = args[filterIndex + 1];
        args.splice(filterIndex, 2); // Remove --filter and its value
    }

    let zipFiles = args.filter(arg => !arg.startsWith('--'));

    // If no files specified, look for all .zip files in current directory
    if (zipFiles.length === 0) {
        console.log('No files specified, searching current directory for ZIP files...\n');
        const files = fs.readdirSync('.');
        zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip') && f !== 'node_modules.zip');

        if (zipFiles.length === 0) {
            console.error('❌ No ZIP files found in current directory\n');
            console.log('Usage:');
            console.log('  node merge-zips.js file1.zip file2.zip file3.zip ...');
            console.log('  node merge-zips.js --filter "filename.docx" file1.zip file2.zip ...');
            console.log('  OR place all ZIPs in current directory and run: node merge-zips.js\n');
            process.exit(1);
        }

        console.log(`Found ${zipFiles.length} ZIP file(s):\n`);
        zipFiles.forEach(f => console.log(`  - ${f}`));
        console.log();
    }

    mergeZipsAndReconstruct(zipFiles, filterFileName).catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}

module.exports = { mergeZipsAndReconstruct };

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Configuration
const DELIMITER = '|~|';

async function diagnoseZips(zipFiles) {
    console.log('QR ZIP Diagnostic Tool');
    console.log('======================\n');

    if (zipFiles.length === 0) {
        console.error('❌ No ZIP files provided');
        console.log('\nUsage:');
        console.log('  node diagnose-zips.js file1.zip file2.zip file3.zip ...');
        process.exit(1);
    }

    const allChunks = new Map(); // chunkIndex -> { fileName, totalChunks, source }
    const fileStats = new Map(); // fileName -> count

    // Process each ZIP file
    for (const zipPath of zipFiles) {
        if (!fs.existsSync(zipPath)) {
            console.log(`⚠️  File not found: ${zipPath} (skipping)\n`);
            continue;
        }

        console.log(`📦 Analyzing: ${path.basename(zipPath)}`);

        try {
            const zip = new AdmZip(zipPath);
            const zipEntries = zip.getEntries();

            let chunkCount = 0;
            const filesInZip = new Set();

            for (const entry of zipEntries) {
                if (entry.entryName.endsWith('.txt') && !entry.isDirectory) {
                    const content = entry.getData().toString('utf8').trim();
                    const parts = content.split(DELIMITER);

                    if (parts.length === 4) {
                        const fileName = parts[0];
                        const chunkIndex = parseInt(parts[1], 10);
                        const totalChunks = parseInt(parts[2], 10);

                        filesInZip.add(`${fileName} (${totalChunks} chunks)`);
                        chunkCount++;

                        // Track file statistics
                        if (!fileStats.has(fileName)) {
                            fileStats.set(fileName, { count: 0, totalChunks, zips: [] });
                        }
                        fileStats.get(fileName).count++;
                        if (!fileStats.get(fileName).zips.includes(path.basename(zipPath))) {
                            fileStats.get(fileName).zips.push(path.basename(zipPath));
                        }

                        // Check for conflicts
                        if (allChunks.has(chunkIndex)) {
                            const existing = allChunks.get(chunkIndex);
                            if (existing.fileName !== fileName) {
                                console.log(`   ⚠️  CONFLICT at chunk ${chunkIndex}:`);
                                console.log(`      Existing: ${existing.fileName} (from ${existing.source})`);
                                console.log(`      New: ${fileName} (from ${path.basename(zipPath)})`);
                            }
                        } else {
                            allChunks.set(chunkIndex, {
                                fileName,
                                totalChunks,
                                source: path.basename(zipPath)
                            });
                        }
                    }
                }
            }

            console.log(`   Chunks: ${chunkCount}`);
            console.log(`   Files detected in this ZIP:`);
            filesInZip.forEach(f => console.log(`      - ${f}`));
            console.log();

        } catch (error) {
            console.log(`   ✗ Failed to read ZIP: ${error.message}\n`);
        }
    }

    console.log('═'.repeat(60));
    console.log('DIAGNOSTIC SUMMARY');
    console.log('═'.repeat(60) + '\n');

    console.log('📋 Files Found Across All ZIPs:\n');

    if (fileStats.size === 0) {
        console.log('   ❌ No valid chunks found!\n');
        return;
    }

    if (fileStats.size > 1) {
        console.log('   ⚠️  WARNING: Multiple files detected! This is likely your problem.\n');
    }

    fileStats.forEach((stats, fileName) => {
        console.log(`   File: ${fileName}`);
        console.log(`   Expected chunks: ${stats.totalChunks}`);
        console.log(`   Chunks found: ${stats.count}`);
        console.log(`   Progress: ${((stats.count / stats.totalChunks) * 100).toFixed(1)}%`);
        console.log(`   Found in ZIPs: ${stats.zips.join(', ')}`);
        console.log();
    });

    // Analyze chunk distribution
    console.log('📊 Chunk Distribution Analysis:\n');

    fileStats.forEach((stats, fileName) => {
        const chunks = [];
        allChunks.forEach((data, index) => {
            if (data.fileName === fileName) {
                chunks.push(index);
            }
        });

        chunks.sort((a, b) => a - b);

        console.log(`   ${fileName}:`);

        // Find gaps
        const gaps = [];
        for (let i = 0; i < chunks.length - 1; i++) {
            const gap = chunks[i + 1] - chunks[i];
            if (gap > 1) {
                gaps.push({ start: chunks[i] + 1, end: chunks[i + 1] - 1, size: gap - 1 });
            }
        }

        if (gaps.length > 0) {
            console.log(`   Missing ranges (${gaps.length} gaps):`);
            if (gaps.length <= 10) {
                gaps.forEach(gap => {
                    if (gap.size === 1) {
                        console.log(`      - Chunk ${gap.start}`);
                    } else {
                        console.log(`      - Chunks ${gap.start} to ${gap.end} (${gap.size} chunks)`);
                    }
                });
            } else {
                console.log(`      - Too many gaps to display (${gaps.length} gaps total)`);
                console.log(`      - First gap: ${gaps[0].start} to ${gaps[0].end}`);
                console.log(`      - Last gap: ${gaps[gaps.length - 1].start} to ${gaps[gaps.length - 1].end}`);
            }
        } else {
            console.log(`   ✓ No gaps detected in scanned chunks`);
        }

        // Check if missing chunks at start or end
        if (chunks[0] !== 0) {
            console.log(`   ⚠️  Missing chunks from beginning: 0 to ${chunks[0] - 1}`);
        }
        if (chunks[chunks.length - 1] !== stats.totalChunks - 1) {
            console.log(`   ⚠️  Missing chunks at end: ${chunks[chunks.length - 1] + 1} to ${stats.totalChunks - 1}`);
        }

        console.log();
    });

    // Recommendations
    console.log('═'.repeat(60));
    console.log('RECOMMENDATIONS');
    console.log('═'.repeat(60) + '\n');

    if (fileStats.size > 1) {
        console.log('❌ PROBLEM DETECTED: Mixed QR codes from different files!\n');
        console.log('You scanned QR codes from multiple files:');
        fileStats.forEach((stats, fileName) => {
            console.log(`   - ${fileName} (${stats.count} chunks)`);
        });
        console.log();
        console.log('💡 Solutions:');
        console.log('   1. Separate the chunks by filename manually');
        console.log('   2. Rescan only the QR codes for the file you want');
        console.log('   3. If you want multiple files, scan them separately\n');

        console.log('To extract only one file, use:');
        console.log(`   node merge-zips.js --filter "filename.docx" file1.zip file2.zip ...\n`);

    } else {
        const [fileName, stats] = Array.from(fileStats.entries())[0];
        const percentComplete = ((stats.count / stats.totalChunks) * 100).toFixed(1);

        if (stats.count === stats.totalChunks) {
            console.log('✅ All chunks present! File should reconstruct successfully.\n');
            console.log('If you still get errors, the file data itself might be corrupted.');
            console.log('Try reconstructing with: node merge-zips.js ' + zipFiles.map(f => path.basename(f)).join(' '));
        } else {
            console.log(`⚠️  File is ${percentComplete}% complete (${stats.count}/${stats.totalChunks} chunks)\n`);
            console.log(`Missing: ${stats.totalChunks - stats.count} chunks\n`);
            console.log('💡 Next steps:');
            console.log('   1. Continue scanning the missing QR codes');
            console.log('   2. Use --partial flag to create incomplete file (will be corrupted)');
        }
    }
}

// Main execution
if (require.main === module) {
    let zipFiles = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

    // If no files specified, look for all .zip files in current directory
    if (zipFiles.length === 0) {
        console.log('No files specified, searching current directory for ZIP files...\n');
        const files = fs.readdirSync('.');
        zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip') && f !== 'node_modules.zip');

        if (zipFiles.length === 0) {
            console.error('❌ No ZIP files found in current directory\n');
            process.exit(1);
        }
    }

    diagnoseZips(zipFiles).catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}

module.exports = { diagnoseZips };

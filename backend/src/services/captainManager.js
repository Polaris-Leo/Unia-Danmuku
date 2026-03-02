import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DATA_DIR = path.join(process.cwd(), 'data');
const CAPTAINS_DIR = path.join(DATA_DIR, 'captains');

class CaptainManager {
    constructor() {
        this.initialized = false;
        
        // Ensure captains directory exists
        if (!fs.existsSync(CAPTAINS_DIR)) {
            fs.mkdirSync(CAPTAINS_DIR, { recursive: true });
        }
    }

    /**
     * Initialize
     */
    async init() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[CaptainManager] Initialized (Segmented File Mode)');
    }

    /**
     * Get file path for a specific timestamp and room
     * Format: captains/<roomId>/YYYY-MM.jsonl
     */
    _getFilePath(roomId, timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const roomDir = path.join(CAPTAINS_DIR, String(roomId));
        
        if (!fs.existsSync(roomDir)) {
            fs.mkdirSync(roomDir, { recursive: true });
        }
        
        return path.join(roomDir, `${year}-${month}.jsonl`);
    }

    /**
     * Get all captain files sorted by date (newest first)
     * Optional: filter by roomId
     */
    _getAllFiles(targetRoomId = null) {
        try {
            if (!fs.existsSync(CAPTAINS_DIR)) return [];
            
            let files = [];
            
            // Get all room directories
            const roomDirs = fs.readdirSync(CAPTAINS_DIR).filter(f => {
                return fs.statSync(path.join(CAPTAINS_DIR, f)).isDirectory();
            });

            for (const roomId of roomDirs) {
                if (targetRoomId && String(roomId) !== String(targetRoomId)) continue;
                
                const roomPath = path.join(CAPTAINS_DIR, roomId);
                const roomFiles = fs.readdirSync(roomPath)
                    .filter(f => /^\d{4}-\d{2}\.jsonl$/.test(f))
                    .map(f => path.join(roomPath, f));
                
                files = files.concat(roomFiles);
            }

            // Sort by filename (YYYY-MM) descending to get newest first
            // Note: Since files are from different folders, we compare basenames
            return files.sort((a, b) => {
                const nameA = path.basename(a);
                const nameB = path.basename(b);
                return nameB.localeCompare(nameA);
            });
        } catch (e) {
            console.error('Error getting files:', e);
            return [];
        }
    }

    /**
     * Add a new captain record
     * @param {Object} data - Captain data
     */
    async addCaptain(data) {
        if (!this.initialized) await this.init();
        
        if (!data.room_id) {
            console.error('[CaptainManager] Missing room_id for record:', data);
            return null;
        }

        const timestamp = data.timestamp || Date.now();
        // Generate a deterministic ID if possible to help with dedup, or random
        // If importing, we use a deterministic ID. For live, random is fine but deterministic is better.
        // Let's use deterministic if uid and timestamp are present.
        const id = data.id || `${data.room_id}-${data.uid}-${timestamp}`;

        const record = {
            ...data,
            timestamp,
            id
        };

        const filePath = this._getFilePath(data.room_id, timestamp);
        
        // Simple deduplication check for the TARGET file specifically
        // We read the file to check if this ID exists? 
        // For high performance logging, usually we just append. 
        // But the user asked for deduplication especially for import.
        // Let's do a check only if strictly necessary or rely on `importFromHistory` to do the check.
        // For live data (addCaptain), usually we trust the source.
        
        const line = JSON.stringify(record) + '\n';
        
        // Append to specific updated file path
        await fs.promises.appendFile(filePath, line, 'utf8');

        return record;
    }

    /**
     * Check if a record exists in the target file (for deduplication)
     * This is relatively expensive so only use during import
     */
    async _exists(roomId, timestamp, uid, guardLevel) {
        const filePath = this._getFilePath(roomId, timestamp);
        if (!fs.existsSync(filePath)) return false;

        try {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

            for await (const line of rl) {
                if (!line.trim()) continue;
                try {
                    const record = JSON.parse(line);
                    // Match fairly strictly
                    if (record.uid === uid && 
                        record.guard_level === guardLevel && 
                        Math.abs(record.timestamp - timestamp) < 1000) { // Tolerance of 1s
                        return true;
                    }
                } catch (e) {}
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    /**
     * Import historical data from guard.jsonl files
     * @param {boolean} force - If true, clear existing data before import
     * @returns {Promise<Object>} stats
     */
    async importFromHistory(force = false) {
        console.log(`[CaptainManager] Starting history import... (Force: ${force})`);
        const historyDir = path.join(process.cwd(), 'data', 'history');
        if (!fs.existsSync(historyDir)) return { added: 0, skipped: 0 };

        // If force, backup and clear existing data
        if (force) {
             const backupDir = path.join(process.cwd(), 'data', `captains_backup_${Date.now()}`);
             if (fs.existsSync(CAPTAINS_DIR)) {
                 try {
                     await fs.promises.cp(CAPTAINS_DIR, backupDir, { recursive: true });
                     console.log(`[CaptainManager] Backed up captains to ${backupDir}`);
                     
                     // Delete content of captains dir
                     await fs.promises.rm(CAPTAINS_DIR, { recursive: true, force: true });
                     await fs.promises.mkdir(CAPTAINS_DIR, { recursive: true });
                     
                     // Must re-init since folder was deleted
                     this.initialized = false;
                     await this.init();
                 } catch (e) {
                     console.error('[CaptainManager] Backup/Clear failed:', e);
                 }
             }
        }

        let addedCount = 0;
        let skippedCount = 0;

        // Recursive walk
        // Structure: data/history/<roomId>/<sessionId>/guard.jsonl
        
        const rooms = await fs.promises.readdir(historyDir);
        
        for (const roomId of rooms) {
            const roomDir = path.join(historyDir, roomId);
            if (!fs.statSync(roomDir).isDirectory()) continue;

            const sessions = await fs.promises.readdir(roomDir);
            
            for (const sessionId of sessions) {
                const sessionDir = path.join(roomDir, sessionId);
                if (!fs.statSync(sessionDir).isDirectory()) continue;

                const guardFile = path.join(sessionDir, 'guard.jsonl');
                if (fs.existsSync(guardFile)) {
                    // Process this file
                    const fileStream = fs.createReadStream(guardFile);
                    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

                    for await (const line of rl) {
                        if (!line.trim()) continue;
                        try {
                            const event = JSON.parse(line);
                            if (event.type === 'guard' || event.guardLevel) {
                                const uid = event.user?.uid || event.uid;
                                const username = event.user?.username || event.username;
                                const level = event.guardLevel || event.guard_level;
                                let ts = event.timestamp ? event.timestamp * 1000 : 0; // Convert sec to ms
                                
                                // Fix invalid timestamp
                                if (ts === 0) ts = parseInt(sessionId) * 1000; // Fallback to session start (seconds -> ms)

                                if (uid && level) {
                                    // CHECK DUPLICATE
                                    const exists = await this._exists(roomId, ts, uid, level);
                                    if (exists) {
                                        skippedCount++;
                                        continue;
                                    }

                                    const record = {
                                        uid,
                                        username,
                                        guard_level: level,
                                        timestamp: ts,
                                        entry_type: 'import',
                                        days: event.days || 0,
                                        num: event.num || 1, // Store num from event
                                        price: event.price || 0,
                                        room_id: parseInt(roomId),
                                        source_stream_id: String(sessionId),
                                        id: `import-${roomId}-${uid}-${ts}`
                                    };

                                    await this.addCaptain(record);
                                    addedCount++;
                                }
                            }
                        } catch (e) { 
                            // ignore entry error 
                        }
                    }
                }
            }
        }

        console.log(`[CaptainManager] Import finished. Added: ${addedCount}`);
        return { added: addedCount, skipped: skippedCount };
    }

    /**
     * Query captains across multiple files
     */
        async getCaptains(filters = {}, pagination = { page: 1, limit: 50 }) {
        if (!this.initialized) await this.init();

        const { uid: queryUid, username, levels, startDate, endDate, roomId, source_stream_id } = filters;
        const page = pagination.page || 1;

        const limit = pagination.limit || 20;

        // Filter values
        const filterUid = queryUid ? parseInt(queryUid) : null;
        
        let filterLevels = null;
        if (levels) { // Comma separated string or array
             const arr = Array.isArray(levels) ? levels : (typeof levels === 'string' ? levels.split(',') : []);
             const nums = arr.map(l => parseInt(l)).filter(l => !isNaN(l));
             if (nums.length > 0) filterLevels = new Set(nums);
        }

        const filterStart = startDate ? parseInt(startDate) : null;
        const filterEnd = endDate ? parseInt(endDate) : null;
        const searchName = username ? username.toLowerCase() : null;
        const filterRoomId = roomId ? String(roomId) : null;
        const filterSourceStreamId = source_stream_id ? String(source_stream_id) : null;

        let matchingRecords = [];
        let files = this._getAllFiles(filterRoomId);

        // Optimization: If date range is provided, skip files outside range
        if (filterStart || filterEnd) {
            files = files.filter(f => {
                const match = path.basename(f).match(/^(\d{4})-(\d{2})\.jsonl$/);
                if (!match) return true;
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1; // 0-indexed
                const fileStart = new Date(year, month, 1).getTime();
                const fileEnd = new Date(year, month + 1, 0, 23, 59, 59).getTime();

                if (filterStart && fileEnd < filterStart) return false;
                if (filterEnd && fileStart > filterEnd) return false;
                return true;
            });
        }

        // Iterate files (newest first)
        for (const file of files) {
            if (!fs.existsSync(file)) continue;

            const content = await fs.promises.readFile(file, 'utf8');
            const lines = content.split('\n');
            
            // Reverse lines to get newest first within file
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (!line) continue;
                
                try {
                    const record = JSON.parse(line);
                    
                    // Apply filters
                    // Convert roomId to string for comparison safely
                    const recordRoomId = record.room_id ? String(record.room_id) : '';
                    if (filterRoomId && recordRoomId !== filterRoomId) continue;
                    
                    if (filterSourceStreamId && record.source_stream_id !== filterSourceStreamId) continue;

                    if (filterUid && record.uid !== filterUid) continue;
                    if (searchName && (!record.username || !record.username.toLowerCase().includes(searchName))) continue;
                    
                    // Filter by levels set
                    if (filterLevels && !filterLevels.has(Number(record.guard_level))) continue;
                    
                    if (filterStart && record.timestamp < filterStart) continue;
                    if (filterEnd && record.timestamp > filterEnd) continue;

                    matchingRecords.push(record);
                } catch (e) {}
            }
        }
        
        // Sort by timestamp asc (Oldest first)
        matchingRecords.sort((a, b) => a.timestamp - b.timestamp);

        const total = matchingRecords.length;
        // Pagination logic
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const items = matchingRecords.slice(startIndex, endIndex);

        return {
            items,
            total,
            page,
            limit
        };
    }

    /**
     * Get statistics
     */
    async getStats(targetRoomId = null) {
        if (!this.initialized) await this.init();
        
        let count = 0;
        const uniqueUids = new Set();
        const files = this._getAllFiles(targetRoomId);

        for (const file of files) {
            const fileStream = fs.createReadStream(file);
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

            for await (const line of rl) {
                if (!line.trim()) continue;
                try {
                    const match = line.match(/"uid":(\d+)/);
                    if (match) {
                        uniqueUids.add(match[1]);
                    }
                    count++;
                } catch (err) {}
            }
        }

        return {
            totalRecords: count,
            uniqueCaptains: uniqueUids.size
        };
    }
}

export const captainManager = new CaptainManager();


import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getConfig, saveConfig } from '../utils/thankYouStorage.js';
import { roomManager } from '../services/roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path relative to this file to ensure correctness
    const uploadDir = path.join(__dirname, '../../data', 'daxie');
    console.log('Uploading to directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      console.log('Directory does not exist, creating...');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const roomId = req.body.roomId || 'common';
    const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();
    const filename = `${safeRoomId}-${timestamp}${path.extname(file.originalname)}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

// Upload asset (image/audio) - MUST BE BEFORE /:roomId
router.post('/upload', upload.single('file'), (req, res) => {
  console.log('Upload request received');
  if (!req.file) {
    console.error('No file in request');
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  console.log('File uploaded successfully:', req.file.filename);
  
  // Return the URL to the file
  // Use relative URL, relying on frontend proxy or server static file serving
  const fileUrl = `/daxie/${req.file.filename}`;
  console.log('Sending response with URL:', fileUrl);
  
  // Explicitly construct the response object to avoid any prototype issues or middleware interference
  const responseData = {
    success: true,
    url: fileUrl,
    timestamp: Date.now()
  };
  
  res.status(200).send(responseData);
});

// Get config for a room
router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;
  const config = getConfig(roomId);
  res.json({ success: true, config });
});

// Save config for a room
router.post('/:roomId', (req, res) => {
  const { roomId } = req.params;
  const config = req.body;
  const savedConfig = saveConfig(roomId, config);
  
  // Broadcast config update event to the room
  roomManager.broadcastToRoom(roomId, { type: 'config_updated', config: savedConfig });
  
  res.json({ success: true, config: savedConfig });
});

export default router;

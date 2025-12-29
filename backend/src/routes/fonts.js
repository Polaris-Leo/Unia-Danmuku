import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const fontsDir = path.join(__dirname, '../../data/fonts');

// Ensure fonts directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Configure Multer for font uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, fontsDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename but ensure safety
    // Use Buffer.from(file.originalname, 'latin1').toString('utf8') to handle non-ASCII filenames correctly if needed,
    // but multer might handle it. Let's stick to simple handling first.
    // Actually, for Chinese filenames, we might want to be careful.
    // Let's just use the original name.
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (/\.(ttf|otf|woff|woff2)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only font files are allowed!'), false);
    }
  }
});

// Get list of fonts
router.get('/', (req, res) => {
  fs.readdir(fontsDir, (err, files) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      console.error('Error reading fonts directory:', err);
      return res.status(500).json({ error: 'Failed to list fonts' });
    }
    
    const fontFiles = files.filter(file => /\.(ttf|otf|woff|woff2)$/i.test(file));
    
    const fonts = fontFiles.map(file => ({
      name: file.replace(/\.(ttf|otf|woff|woff2)$/i, ''),
      fileName: file,
      url: `/fonts/${file}`,
      family: file.replace(/\.(ttf|otf|woff|woff2)$/i, '')
    }));
    
    res.json(fonts);
  });
});

// Upload font
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  res.json({ 
    success: true, 
    message: 'Font uploaded successfully',
    font: {
      name: req.file.filename.replace(/\.(ttf|otf|woff|woff2)$/i, ''),
      fileName: req.file.filename,
      url: `/fonts/${req.file.filename}`,
      family: req.file.filename.replace(/\.(ttf|otf|woff|woff2)$/i, '')
    }
  });
});

export default router;

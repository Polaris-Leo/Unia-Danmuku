import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'clock-settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default settings
const DEFAULT_SETTINGS = {
  timezone: 'auto',
  fontFamily: 'System Default',
  fontSize: 60,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 4,
  fontWeight: 'bold',
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 0,
  format: 'HH:mm:ss',
  customFormat: ''
};

// Helper to load config
const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...savedConfig };
    }
  } catch (error) {
    console.error('Failed to load Clock config:', error);
  }
  return DEFAULT_SETTINGS;
};

// Helper to save config
const saveConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save Clock config:', error);
    return false;
  }
};

/**
 * Get Clock settings
 * GET /api/clock/settings
 */
router.get('/settings', (req, res) => {
  const config = loadConfig();
  res.json({
    success: true,
    settings: config
  });
});

/**
 * Save Clock settings
 * POST /api/clock/settings
 */
router.post('/settings', (req, res) => {
  const newSettings = req.body;
  if (saveConfig(newSettings)) {
    res.json({
      success: true,
      settings: newSettings
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to save settings'
    });
  }
});

export default router;

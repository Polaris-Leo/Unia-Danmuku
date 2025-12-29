import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'obs-settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to load config
const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to load OBS config:', error);
  }
  return {};
};

// Helper to save config
const saveConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save OBS config:', error);
    return false;
  }
};

/**
 * Get OBS settings
 * GET /api/obs/settings
 */
router.get('/settings', (req, res) => {
  const config = loadConfig();
  res.json({
    success: true,
    settings: config
  });
});

/**
 * Save OBS settings
 * POST /api/obs/settings
 */
router.post('/settings', (req, res) => {
  const settings = req.body;
  if (!settings) {
    return res.status(400).json({
      success: false,
      message: 'Missing settings data'
    });
  }

  if (saveConfig(settings)) {
    res.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to save settings'
    });
  }
});

export default router;

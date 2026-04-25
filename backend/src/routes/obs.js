import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'obs-settings.json');
const CONFIG_FILE_TEMPLATE = path.join(DATA_DIR, 'obs-settings-template.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to load config with template support
const loadConfig = (templateId = 'default') => {
  try {
    // Load template-specific config if exists
    const templateFile = path.join(DATA_DIR, `obs-settings-${templateId}.json`);
    if (fs.existsSync(templateFile)) {
      return JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
    }

    // Fallback to main config
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to load OBS config:', error);
  }
  return {};
};

// Helper to load all templates config
const loadAllTemplates = () => {
  const templates = {
    default: {},
    1: {},
  };

  try {
    // Load default template
    if (fs.existsSync(CONFIG_FILE)) {
      templates.default = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }

    // Load template 1 (small version)
    const template1File = path.join(DATA_DIR, 'obs-settings-1.json');
    if (fs.existsSync(template1File)) {
      templates['1'] = JSON.parse(fs.readFileSync(template1File, 'utf-8'));
    }

    // Load template config file if exists (for managing all templates)
    if (fs.existsSync(CONFIG_FILE_TEMPLATE)) {
      const templateConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_TEMPLATE, 'utf-8'));
      Object.assign(templates, templateConfig);
    }
  } catch (error) {
    console.error('Failed to load templates config:', error);
  }

  return templates;
};

// Helper to save config
const saveConfig = (config, templateId = 'default') => {
  try {
    const targetFile = templateId === 'default'
      ? CONFIG_FILE
      : path.join(DATA_DIR, `obs-settings-${templateId}.json`);

    fs.writeFileSync(targetFile, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save OBS config:', error);
    return false;
  }
};

/**
 * Get OBS settings
 * GET /api/obs/settings?template=default|1|...
 */
router.get('/settings', (req, res) => {
  const templateId = req.query.template || 'default';
  const config = loadConfig(templateId);
  res.json({
    success: true,
    settings: config,
    template: templateId
  });
});

/**
 * Get all templates settings
 * GET /api/obs/settings/all
 */
router.get('/settings/all', (req, res) => {
  const templates = loadAllTemplates();
  res.json({
    success: true,
    templates: templates
  });
});

/**
 * Save OBS settings
 * POST /api/obs/settings?template=default|1|...
 */
router.post('/settings', (req, res) => {
  const settings = req.body;
  const templateId = req.query.template || 'default';

  if (!settings) {
    return res.status(400).json({
      success: false,
      message: 'Missing settings data'
    });
  }

  if (saveConfig(settings, templateId)) {
    res.json({
      success: true,
      message: 'Settings saved successfully',
      template: templateId
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to save settings'
    });
  }
});

export default router;

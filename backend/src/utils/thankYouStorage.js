import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'thankyou-configs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let configs = {};

export const loadConfigs = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      configs = JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load thank you configs:', error);
  }
  return configs;
};

export const saveConfigs = () => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
  } catch (error) {
    console.error('Failed to save thank you configs:', error);
  }
};

export const getConfig = (roomId) => {
  if (Object.keys(configs).length === 0) {
    loadConfigs();
  }
  return configs[roomId] || null;
};

export const saveConfig = (roomId, config) => {
  if (Object.keys(configs).length === 0) {
    loadConfigs();
  }
  configs[roomId] = config;
  saveConfigs();
  return config;
};

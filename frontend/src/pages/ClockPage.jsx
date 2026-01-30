import React, { useState, useEffect } from 'react';
import { getClockSettings } from '../services/api';
import ClockDisplay from './ClockDisplay';
import './ClockPage.css';

const ClockPage = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Apply OBS overlay specific styles
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.height = '100vh';
    document.body.style.width = '100vw';

    // Cleanup on unmount
    return () => {
        document.documentElement.style.background = '';
        document.body.style.background = '';
        document.body.style.overflow = '';
        document.body.style.margin = '';
        document.body.style.height = '';
        document.body.style.width = '';
    };
  }, []);

  useEffect(() => {
    // Load settings
    const loadSettings = async () => {
      try {
        const response = await getClockSettings();
        if (response.success) {
          setSettings(response.settings);
        }
      } catch (error) {
        console.error('Failed to load clock settings:', error);
      }
    };
    
    // Load fonts to ensure they are available
     fetch('/api/fonts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            // Dynamically load fonts
            data.forEach(font => {
                const fontFace = new FontFace(font.family, `url("${font.url}")`);
                fontFace.load().then(loadedFace => {
                  document.fonts.add(loadedFace);
                }).catch(err => console.error('Font load failed:', err));
            });
        }
      })
      .catch(console.error);

    loadSettings();
    // Poll settings every 5 seconds
    const settingsInterval = setInterval(loadSettings, 5000);

    return () => clearInterval(settingsInterval);
  }, []);

  if (!settings) return null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ClockDisplay settings={settings} />
    </div>
  );
};

export default ClockPage;

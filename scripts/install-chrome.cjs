const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Render.com で Puppeteer を動かすための設定
 * 1. プロジェクト配下にキャッシュディレクトリを作成
 * 2. Puppeteer が要求する Chrome をインストール
 */
try {
  const puppeteerCacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.cache', 'puppeteer');
  const playwrightCacheDir = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.env.RENDER ? '/opt/render/.cache/ms-playwright' : path.join(process.cwd(), '.cache', 'ms-playwright'));
  fs.mkdirSync(puppeteerCacheDir, { recursive: true });
  fs.mkdirSync(playwrightCacheDir, { recursive: true });

  console.log(`Installing Chromium via Playwright into: ${playwrightCacheDir}`);
  execSync('npx playwright install chromium', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: playwrightCacheDir,
      PUPPETEER_CACHE_DIR: puppeteerCacheDir,
    },
  });
  console.log('Chromium installed successfully via Playwright.');
} catch (error) {
  console.error('Failed to install Chrome:', error);
  if (process.env.RENDER) {
    process.exit(1);
  }
}

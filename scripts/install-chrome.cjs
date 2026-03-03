const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Render.com で Puppeteer を動かすための設定
 * 1. プロジェクト配下にキャッシュディレクトリを作成
 * 2. Puppeteer が要求する Chrome をインストール
 */
try {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.cache', 'puppeteer');
  fs.mkdirSync(cacheDir, { recursive: true });

  console.log(`Installing Chrome for Puppeteer into: ${cacheDir}`);
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: cacheDir,
    },
  });
  console.log('Chrome installed successfully for Puppeteer.');
} catch (error) {
  console.error('Failed to install Chrome:', error);
  if (process.env.RENDER) {
    process.exit(1);
  }
}

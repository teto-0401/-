const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Render.com で Puppeteer を動かすための設定
 * 1. .cache/puppeteer を作成
 * 2. chrome をインストール
 */
try {
  console.log('Installing Chromium using Playwright...');
  // Playwright を使用して Chromium をインストール
  execSync('npx playwright install chromium', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('Chromium installed successfully.');
} catch (error) {
  console.error('Failed to install Chrome:', error);
  // Replit環境などでは既にインストールされている可能性があるため、エラーでも続行
}

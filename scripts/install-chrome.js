const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Render.com で Puppeteer を動かすための設定
 * 1. .cache/puppeteer を作成
 * 2. chrome をインストール
 */
try {
  console.log('Installing Chrome for Puppeteer...');
  const cachePath = path.join(process.cwd(), '.cache', 'puppeteer');
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }
  
  // PUPPETEER_CACHE_DIR を環境変数として設定した状態でインストールを実行
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: { ...process.env, PUPPETEER_CACHE_DIR: cachePath }
  });
  console.log('Chrome installed successfully.');
} catch (error) {
  console.error('Failed to install Chrome:', error);
  // Replit環境などでは既にインストールされている可能性があるため、エラーでも続行
}

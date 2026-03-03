import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, CDPSession } from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

function findChromeFromPuppeteerCache(cacheRoot: string): string | undefined {
  const chromeRoot = path.join(cacheRoot, 'chrome');
  if (!fs.existsSync(chromeRoot)) return undefined;

  const builds = fs.readdirSync(chromeRoot, { withFileTypes: true });
  for (const build of builds) {
    if (!build.isDirectory()) continue;
    const base = path.join(chromeRoot, build.name);
    const candidates = [
      path.join(base, 'chrome-linux64', 'chrome'),
      path.join(base, 'chrome-linux', 'chrome'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return undefined;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdp: CDPSession | null = null;
  private isClosing = false;
  
  constructor(
    private onFrame: (data: string) => void,
    private onNavigated: (url: string) => void,
    private onError: (msg: string) => void
  ) {}

  async start() {
    try {
      process.env.PUPPETEER_CACHE_DIR ??= path.join(process.cwd(), '.cache', 'puppeteer');
      process.env.PLAYWRIGHT_BROWSERS_PATH ??= process.env.RENDER
        ? '/opt/render/.cache/ms-playwright'
        : path.join(process.cwd(), '.cache', 'ms-playwright');
      let execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (!execPath) {
        const puppeteerCachePaths = [
          process.env.PUPPETEER_CACHE_DIR,
          path.join(process.cwd(), '.cache', 'puppeteer'),
          path.join(process.env.HOME || '', '.cache', 'puppeteer'),
          '/opt/render/.cache/puppeteer',
        ].filter(Boolean) as string[];

        for (const cachePath of puppeteerCachePaths) {
          const found = findChromeFromPuppeteerCache(cachePath);
          if (found) {
            execPath = found;
            break;
          }
        }
      }

      if (!execPath) {
        // Playwright の標準的なキャッシュパスを確認
        const pwPaths = [
          process.env.PLAYWRIGHT_BROWSERS_PATH,
          path.join(process.env.HOME || '', '.cache/ms-playwright'),
          '/opt/render/.cache/ms-playwright'
        ].filter(Boolean) as string[];
        
        for (const base of pwPaths) {
          if (fs.existsSync(base)) {
            // chromium-* ディレクトリ配下の chrome バイナリを探す
            const dirs = fs.readdirSync(base);
            const chromiumDir = dirs.find(d => d.startsWith('chromium-'));
            if (chromiumDir) {
              const fullPath = path.join(base, chromiumDir, 'chrome-linux/chrome');
              if (fs.existsSync(fullPath)) {
                execPath = fullPath;
                break;
              }
            }
          }
        }
      }
      
      if (!execPath) {
        try {
          execPath = execSync('which chromium || which google-chrome-stable || which google-chrome').toString().trim();
        } catch (e) {
          // fallback
        }
      }

      if (execPath) {
        console.log(`[Browser] Launching with executable: ${execPath}`);
      } else {
        console.warn(`[Browser] No executablePath found, relying on Puppeteer cache: ${process.env.PUPPETEER_CACHE_DIR}`);
      }

      this.browser = await puppeteer.launch({
        headless: "new",
        executablePath: execPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--lang=ja-JP',
          '--window-size=800,600'
        ],
        defaultViewport: { width: 800, height: 600 }
      });

      this.browser.on('disconnected', () => {
        if (!this.isClosing) {
          console.error('[Browser] Abnormal termination: Browser disconnected unexpectedly.');
          this.onError('Browser disconnected abnormally');
        }
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();

      this.page.on('framenavigated', (frame) => {
        if (frame === this.page?.mainFrame()) {
          this.onNavigated(frame.url());
        }
      });

      this.page.on('error', (err) => {
        console.error('[Browser Page] Crash/Error:', err.message);
        this.onError(`Page crashed: ${err.message}`);
      });

      this.cdp = await this.page.target().createCDPSession();
      await this.cdp.send('Page.enable');
      await this.cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 50,
        everyNthFrame: 1
      });

      this.cdp.on('Page.screencastFrame', async (event) => {
        const { data, sessionId } = event;
        this.onFrame(data);
        if (this.cdp) {
          await this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
        }
      });

      console.log('[Browser] Started successfully');
    } catch (err) {
      console.error('[Browser] Failed to start:', err);
      this.onError(err instanceof Error ? err.message : String(err));
    }
  }
  
  async updateScreencastSettings(quality: number, everyNthFrame: number) {
    if (!this.cdp) return;
    try {
      await this.cdp.send('Page.stopScreencast');
      await this.cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality,
        everyNthFrame
      });
      console.log(`[Browser] Screencast settings updated: quality=${quality}, everyNthFrame=${everyNthFrame}`);
    } catch (err) {
      console.error('[Browser] Failed to update screencast:', err);
    }
  }

  async goto(url: string) {
    if (!this.page) return;
    try {
      let targetUrl = url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
         targetUrl = 'https://' + targetUrl;
      }
      await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    } catch (err) {
      console.error(`[Browser] Failed to navigate to ${url}:`, err);
    }
  }
  
  async mouseMove(x: number, y: number) {
    await this.page?.mouse.move(x, y).catch(() => {});
  }

  async mouseDown(button: 'left'|'middle'|'right') {
    await this.page?.mouse.down({ button }).catch(() => {});
  }

  async mouseUp(button: 'left'|'middle'|'right') {
    await this.page?.mouse.up({ button }).catch(() => {});
  }

  async keyDown(key: string) {
    await this.page?.keyboard.down(key as any).catch(() => {});
  }

  async keyUp(key: string) {
    await this.page?.keyboard.up(key as any).catch(() => {});
  }

  async scroll(deltaX: number, deltaY: number) {
    await this.page?.evaluate((dx, dy) => {
      window.scrollBy(dx, dy);
    }, deltaX, deltaY).catch(() => {});
  }

  async close() {
    this.isClosing = true;
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

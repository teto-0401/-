import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, CDPSession } from 'puppeteer';
import { execSync } from 'child_process';

puppeteer.use(StealthPlugin());

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
      let execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (!execPath) {
        try {
          execPath = execSync('which chromium').toString().trim();
        } catch (e) {
          // fallback
        }
      }

      this.browser = await puppeteer.launch({
        headless: "new",
        executablePath: execPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
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

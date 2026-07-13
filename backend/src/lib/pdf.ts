import puppeteer, { Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

// Chromium takes over a second to launch, so keep one instance running
// for the lifetime of the server instead of starting a fresh one per request.
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  return browserPromise;
}

// A4 at 96 CSS px per inch (Puppeteer's default resolution for page.pdf sizing)
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
    await page.setContent(html, { waitUntil: 'load' });

    // Documents are laid out to read as one page. If the content runs a little
    // taller than A4, scale it down instead of spilling a mostly blank second
    // page, rather than hand tuning margins per template.
    const contentHeight = await page.evaluate(() => (globalThis as any).document.documentElement.scrollHeight);
    const scale = Math.min(1, (A4_HEIGHT_PX - 10) / contentHeight);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      scale,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

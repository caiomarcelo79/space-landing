import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'scroll_top.png' });

  // Simulate fast mouse wheel scroll down
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'scroll_mid.png' });

  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'scroll_end.png' });

  console.log('Automated Playwright scroll test completed successfully!');
  await browser.close();
})();

const { chromium } = require('playwright');
const path = require('path');

const pages = [
  { file: 'Login.dc.html', out: 'ui_login.png' },
  { file: 'Main.dc.html', out: 'ui_dashboard.png' },
  { file: 'DataSensor.dc.html', out: 'ui_datasensor.png' },
  { file: 'ActionHistory.dc.html', out: 'ui_actionhistory.png' },
  { file: 'Profile.dc.html', out: 'ui_profile.png' },
];

const designDir = path.resolve(__dirname, '../../design');
const outDir = path.resolve(__dirname, 'ui');

(async () => {
  const fs = require('fs');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pageObj = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const { file, out } of pages) {
    const filePath = 'file://' + path.join(designDir, file);
    await pageObj.goto(filePath, { waitUntil: 'networkidle' });
    await pageObj.screenshot({ path: path.join(outDir, out) });
    console.log('Captured', out);
  }

  await browser.close();
})();

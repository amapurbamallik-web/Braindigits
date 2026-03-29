const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR CONSOLE:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('BROWSER UNCAUGHT ERROR:', err.toString());
  });

  try {
    await page.goto('http://localhost:8082', { waitUntil: 'networkidle0' });
    
    // Play as Guest (skip login)
    await page.waitForSelector('button:has-text("Play as Guest")');
    await page.click('button:has-text("Play as Guest")');
    
    // Click play with friends
    await page.waitForXPath("//h3[contains(text(), 'Play with Friends')]");
    const friendsCard = await page.$x("//h3[contains(text(), 'Play with Friends')]/ancestor::div[contains(@class, 'group')]");
    if (friendsCard.length > 0) {
      await friendsCard[0].click();
    }
    
    // Create Room
    await page.waitForXPath("//button[contains(text(), 'Create Room')]");
    const createBtn = await page.$x("//button[contains(text(), 'Create Room')]");
    if (createBtn.length > 0) {
      await createBtn[0].click();
    }
    
    await page.waitForTimeout(1000);
    
    // Leave Room
    await page.waitForXPath("//button[contains(text(), 'Leave Room')]");
    const leaveBtn = await page.$x("//button[contains(text(), 'Leave Room')]");
    if (leaveBtn.length > 0) {
      await leaveBtn[0].click();
    }
    
    // Confirm Leave
    await page.waitForXPath("//button[contains(text(), 'Yes, Leave')]");
    const confirmBtn = await page.$x("//button[contains(text(), 'Yes, Leave')]");
    if (confirmBtn.length > 0) {
      await confirmBtn[0].click();
    }

    await page.waitForTimeout(2000); // Give it time to crash
    
    console.log("Test completed, checking for crashes.");
  } catch(e) {
    console.log("TEST SCRIPT ERROR:", e);
  } finally {
    await browser.close();
  }
})();

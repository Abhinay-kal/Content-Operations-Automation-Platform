const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to plugins page...");
    // wp-now automatically logs in if you visit wp-admin
    await page.goto('http://localhost:8881/wp-admin/plugins.php', { waitUntil: 'networkidle0' });
    
    // Check if we are on login page
    if (page.url().includes('wp-login.php')) {
      console.log("Logging in...");
      await page.type('#user_login', 'admin');
      await page.type('#user_pass', 'password');
      await page.click('#wp-submit');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    
    console.log("On plugins page. Looking for our plugin...");
    
    // Check for fatal errors on the plugins page itself
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Fatal error') || bodyText.includes('Parse error')) {
       console.log("Found error on page load:", bodyText.substring(0, 1000));
    }
    
    // Find the activate link for our plugin
    // The plugin folder is wordpress-agent-plugin
    const activateLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.activate a'));
      const ourLink = links.find(l => l.href.includes('wordpress-agent-plugin'));
      return ourLink ? ourLink.href : null;
    });
    
    if (activateLink) {
      console.log("Activating plugin...");
      await page.goto(activateLink, { waitUntil: 'networkidle0' });
      
      const newBodyText = await page.evaluate(() => document.body.innerText);
      console.log("Result after activation:");
      
      // Look for the error message
      const errorDiv = await page.evaluate(() => {
         const err = document.querySelector('.error p, .notice-error p');
         return err ? err.innerText : null;
      });
      
      if (errorDiv) {
         console.log("WP Error Notice:", errorDiv);
      }
      
      if (newBodyText.includes('Fatal error') || newBodyText.includes('Parse error') || newBodyText.includes('Uncaught Error')) {
         const errorMatch = newBodyText.match(/(Fatal error|Parse error|Uncaught Error)[\s\S]{0,500}/i);
         console.log("PHP Error:", errorMatch ? errorMatch[0] : "Could not extract error text");
      }
    } else {
      console.log("Plugin activate link not found or already active.");
      
      // Look for deactivate link to see if it's active
      const deactivateLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('.deactivate a'));
        const ourLink = links.find(l => l.href.includes('wordpress-agent-plugin'));
        return ourLink ? ourLink.href : null;
      });
      
      if (deactivateLink) {
         console.log("Plugin is currently active. Deactivating to try again...");
         await page.goto(deactivateLink, { waitUntil: 'networkidle0' });
         console.log("Deactivated. Please run script again to activate.");
      }
    }
  } catch (err) {
    console.error("Script error:", err);
  } finally {
    await browser.close();
  }
})();

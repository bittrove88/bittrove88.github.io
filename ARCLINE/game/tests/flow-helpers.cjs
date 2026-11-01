'use strict';
exports.beginFirstJourney=async page=>{
 await page.waitForFunction('!document.getElementById("play").disabled');
 if(await page.locator('#installGuide').isVisible())await page.locator('#installLater').click();
 if(await page.locator('#journeyStart').isVisible())await page.locator('#beginJourney').click();
};

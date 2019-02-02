var crawler = require('./crawler.js')
var writeFile = require('write');

async function crawl(url){
  await crawler.scrapeOyez();
  // writeFile.sync("output/transcripts.js", JSON.stringify(results));
}

crawl("https://www.oyez.org/cases/2018");

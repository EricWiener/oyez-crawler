var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath);
}

crawl("https://www.oyez.org/cases/2018");

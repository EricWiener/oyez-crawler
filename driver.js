var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath, 1967, 1967);
}

crawl("https://www.oyez.org/cases/2018");

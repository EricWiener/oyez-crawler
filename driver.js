var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath,
        {
            startYear: 2017,
            endYear: 2000,
            defaultTimeout: 0
        }
    );
}

crawl("https://www.oyez.org/cases/2018");

var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath,
        {
            defaultTimeout: 0,
            startYear: 2009,
            endYear: 2000
        }
    );
}

crawl("https://www.oyez.org/cases/2018");

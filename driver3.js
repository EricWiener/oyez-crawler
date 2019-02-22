var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath,
        {
            defaultTimeout: 0,
            startYear: 1999,
            endYear: 1990
        }
    );
}

crawl("https://www.oyez.org/cases/2018");

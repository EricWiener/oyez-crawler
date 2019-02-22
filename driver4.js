var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath,
        {
            defaultTimeout: 0,
            startYear: 1989,
            endYear: 1980
        }
    );
}

crawl("https://www.oyez.org/cases/2018");

var crawler = require('./crawler.js')

async function crawl(url){
    outputPath = "output/"
    await crawler.scrapeOyez(outputPath,
        {
            defaultTimeout: 0,
            startYear: 1969,
            endYear: 1956
        }
    );
}

crawl("https://www.oyez.org/cases/2018");

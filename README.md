`oyez-crawler` crawls [oyez](https://www.oyez.org) to download transcripts of Supreme Court cases.

The crawler is currently setup to scrape all Supreme Court cases from the current year up to (and including) 1956. Before 1956 there were no audio records of Supreme Court cases, so the transcripts are not readily available.

Because of the significant file size of the transcripts they are immediately saved to files once they are parsed to reduce memory footprint. The crawler has only one required argument, the path to the output directory. The transcripts will then be saved in subdirectories organized by year with the filename being the title of the case. For example, if the output directory were specified to be `~/Downloads/transcripts/`, the case "Air and Liquid Systems Corp. v. Devries" (2018) would be saved at the path `~/Downloads/transcripts/2018/Air and Liquid Systems Corp. v. Devries`. This can of course be changed manually by editing the source code. If you need any assistance with this, please open an issue.

You can also optionally specify the start and end years that you want to scrape to. The start year defaults to whatever the current year is. The end year defaults to 1956 (see above explanation).

## Usage
```
var crawler = require('./crawler.js')

async function crawl(){
    outputPath = "~/Downloads/transcripts/"
    await crawler.scrapeOyez(outputPath);
}
crawl();
```

You can also optionally specify the desired start and end dates.
```
var crawler = require('./crawler.js')

async function crawl(){
    outputPath = "~/Downloads/transcripts/"

    // start in 2015 (inclusively)
    // end in 1980 (inclusively)
    await crawler.scrapeOyez(outputPath, 2015, 1980);
}

crawl();
```

Please open an issue if you need any assistance using this package. 

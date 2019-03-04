`oyez-crawler` crawls [oyez](https://www.oyez.org) to download transcripts of Supreme Court cases.

The crawler is currently setup to scrape all Supreme Court cases from the current year up to (and including) 1956. Before 1956 there were no audio records of Supreme Court cases, so the transcripts are not readily available.

Because of the significant file size of the transcripts they are immediately saved to files once they are parsed to reduce memory footprint. The crawler has only one required argument, the path to the output directory. The transcripts will then be saved in subdirectories organized by year with the filename being the title of the case. For example, if the output directory were specified to be `~/Downloads/transcripts/`, the case "Air and Liquid Systems Corp. v. Devries" (2018) would be saved at the path `~/Downloads/transcripts/2018/Air_and_Liquid_Systems_Corp._v._Devries.js`. This can of course be changed manually by editing the source code. If you need any assistance with this, please open an issue.

The file names are the title of the transcript with all spaces replaced with underscores. This was done to avoid conflicts with hyphens that occurred in the titles originally. Furthermore, all backslashes ("/") will be replaced with a plus sign ("+"). This is to avoid files being split into subdirectories unintentionally. 

You can also optionally specify the start and end years that you want to scrape to. The start year defaults to whatever the current year is. The end year defaults to 1956 (see above explanation). It is also possible to specify the default timeout value for requests (set the value to `0` for unlimited timeouts).

The files are saved in JSON in the form:
```javascript
// ~/Downloads/transcripts/2018/Apple_v._Pepper.js
{
    term: "2018",
    caseName: "Apple v. Pepper",
    caseLink: "https://www.oyez.org/cases/2018/17-204",
    caseTranscripts: [
        {
            transcriptTitle: "Oral Argument - November 26, 2018",
            transcriptLink: "https://apps.oyez.org/player/#/roberts10/oral_argument_audio/24778",
            transcript: [
                {
                    {
                        speakerName: "John G. Roberts, Jr.",
                        textObjs: [
                            {
                                text: "We'll hear argument first ...",
                                start: 0,
                                stop: 6.56,
                                duration: 6.56
                            }
                        ]
                    },
                    {
                        speakerName: "Daniel M. Wall",
                        textObjs:[
                            {
                                text: "Thank you, Mr. Chief Justice, ...",
                                start: 6.56,
                                stop: 46.8,
                                duration: 40.24
                            },
                            {
                                text: "Sample text ...",
                                start: 46.8,
                                stop: 56.8,
                                duration: 10.00
                            }
                        ]
                    }
                }
            ]
        }
    ]
}
```

An array of `caseTranscripts` is used to allow for cases that have more than one transcript as is the case with cases that lasted multiple days. `textObjs` is an array to allow for responses by individual speakers that are separated into separate paragraphs. As would be the case with:
> Daniel M. Wall
>
> Thank you, Mr. Chief Justice, and may it please the Court: The only damages theory in this monopolization action is rooted in a 30 percent commission that Apple charges app developers and which allegedly causes those developers to increase app prices to consumers.
>
> The case is barred by the Court's Illinois Brick doctrine because the developers' pricing decisions are necessarily in the causal chain that links the commission to any consumer damages. If the commission increases beyond the competitive level, but apps developers do not change their apps prices, consumers suffer no damages.


## Usage
```javascript
// driver.js
var crawler = require('./crawler.js');

async function crawl(){
    outputPath = "~/Downloads/transcripts/";
    await crawler.scrapeOyez(outputPath);
}
crawl();
```
You can also optionally specify the desired start and end dates.
```javascript
// driver.js
var crawler = require('./crawler.js');

async function crawl(){
    outputPath = "~/Downloads/transcripts/";

    await crawler.scrapeOyez(outputPath, {
        startYear: 2015, // start in 2015 (inclusively)
        endYear: 1980, // end in 1980 (inclusively)
        defaultTimeout: 0 // no time out
    });
}

crawl();
```

If you run into issues with the javascript heap being overfilled, use the flag `--max-old-space-size=8192` as seen below. You shouldn't run into issues with this usually (cases are saved to files instead of being stored on the heap).
```
$ node --max-old-space-size=8192 driver.js
```
The flag `--max-old-space-size=8192` is used to override node's memory limit. This may be needed for cases with multiple oral arguments.


Please open an issue if you need any assistance using this package.

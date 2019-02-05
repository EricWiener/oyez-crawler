const PUPPETEER = require('puppeteer');
const $ = require('cheerio');
const WRITEFILE = require('write');

async function scrapeOyez(outputDir, startYear = (new Date().getFullYear()), endYear = 1956) {
    let results = [];
    const url = "https://www.oyez.org/cases";

    try {
        // ======= find all links to terms ============
        const browser = await PUPPETEER.launch();
        let page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector("div.full-sidebar");
        let html = await page.content();

        $('div.full-sidebar div.inner div ul#term-dropdown li', html).each(function () {
            link = $(this).find('a').attr('href');
            term = link.split("/")[1];
            link = `https://www.oyez.org/${link}`;

            results.push({
                "term": term,
                "termLink": link,
            });
        });

        // loop through term links
        // this is done outside of .each loop because
        // .each loop doesn't support async
        // let there to handle async looping
        // https://codeburst.io/asynchronous-code-inside-an-array-loop-c5d704006c99
        for (let x = 0; x < results.length && parseInt(results[x].term) >= endYear; ++x) {
            if(parseInt(results[x].term) <= startYear){
                // if the year is before or equal to the start year
                // this is not part of the loop expression because otherwise it would terminate
                // if the current year was before the start year and would not
                // evaluate anything else
                console.log(`Term: ${x + 1}/${results.length}: ${results[x].term}`);
                await getCases(page, results[x].termLink, results[x].term, outputDir);
            }
        }

        // close browser
        browser.close();
    } catch (error) {
        console.log(`scrapeOyez(): Error occurred while finding URL's for individual terms: ${error}`);
    }
}

/*
RECIEVES:
    * PUPPETEER page
    * URL of the case's home page
    * term (string)
    * output directory path prefix (string)
EFFECTS:
    * Saves the case's transcripts to file
CALLS:
    * getCaseTranscripts(page, media link)
*/
// scrapes all the cases of the page of a term
// recieves url of the term page
//

/**
 * Demonstrates how top-level functions follow the same rules.  This one
 * makes an array.
 * @param {TYPE} arg
 * @return {!Array<TYPE>}
 * @template TYPE
 */
async function getCases(page, url, term, outputDir) {

        let cases = [];
    try{
        // goes to the term page
        // no timeout value. Will keep waiting
        // This is garunteed to exist 
        await page.goto(url, {timeout: 0});
    } catch(error){
        console.log(`getCases(): Unable to navigate to ${url}`);
    }

    try {
        await page.waitForSelector("body > div > div > div.page.ng-scope > main > article > div > ng-include > ul > li:nth-child(1) > h2 > a");
        let html = await page.content();

        $("main article div ng-include ul li", html).each(function () {
            caseName = $(this).find('h2 a').text().trim();
            caseLink = `https://www.oyez.org/${$(this).find('h2 a').attr('href')}`;

            cases.push({
                "caseName": caseName,
                "caseLink": caseLink,
            });
        });

        // loop through case links
        // gets the transcripts for each case and appends to case object
        // this is done outside of .each loop because
        // .each loop doesn't support async
        for (let x = 0; x < cases.length; ++x) {
            console.log(`Cases: ${x + 1}/${cases.length}: ${cases[x].caseName}`);
            let tempCase = {
                "term": term,
                "caseName": cases[x].caseName,
                "caseLink": cases[x].caseLink
            };
            tempCase.caseTranscripts = await getCaseTranscripts(page, cases[x].caseLink);
            WRITEFILE.sync(`${outputDir}${term}/${cases[x].caseName.replace(/\s/g, "_")}.js`, JSON.stringify(tempCase));
        }
    } catch (error) {
        console.log(`getCases(): An error ocurred for ${term}: ${error}`);
    }
}

// identifies the media links
// returns empty array if error
async function getCaseTranscripts(page, url) {
    let caseTranscripts = []

    try {
        await page.goto(url); // goes to the case page
    } catch (error){
        console.log(`getCaseTranscripts(): Unable to go to ${url}`);
    }


    try{
        // wait for the case name to load - gives an indication the page is loaded
        await page.waitForSelector("body > div > div > div.page.ng-scope > main > div > div > div > h1");
    }catch (error){
        console.log(`getCaseTranscripts(): Invalid page: ${url}. Error: ${error}`);
        return caseTranscripts;
    }


    try {
        // wait for list of media to load
        await page.waitForSelector('body > div > div > div.page.ng-scope > main > div > div > div > div > div > div.media > ul')
        let html = await page.content();

        // get the media links
        $("div.media ul li", html).each(function () {
            transcriptTitle = $(this).find('a').text().trim();
            transcriptLink = $(this).find('a').attr('iframe-url');

            if (transcriptTitle.includes("Oral Argument")) {
                // exclude non-oral arguments from being included in the parse

                caseTranscripts.push({
                    "transcriptTitle": transcriptTitle,
                    "transcriptLink": transcriptLink,
                });
            } // if
        }); // .each

        // loop through transcripts for a case
        // gets the transcripts for each case and appends to case object
        // this is done outside of .each loop because
        // .each loop doesn't support async
        for (let x = 0; x < caseTranscripts.length; ++x) {
            console.log(`Case transcripts: ${x + 1}/${caseTranscripts.length}: ${caseTranscripts[x].transcriptTitle}`);
            caseTranscripts[x].transcript = await getTranscript(page, caseTranscripts[x].transcriptLink);
        }

        return caseTranscripts;

    } catch (error) {
        console.log(`There is no media for this transcript ${error}`);

        // if there is no media, just returns an empty list
        return caseTranscripts;
    }

}


async function getTranscript(page, url) {
    let transcript = [];

    await page.goto(url); // opens up the transcript

    // wait for the seventh dialogue to load - indication it worked
    // can assume that all court transcripts will have more than 7 dialogues
    await page.waitForSelector("body > div.container > div > div > article > section:nth-child(3) > section:nth-child(7) > p");
    let html = await page.content();

    console.log("Parsing transcript ...");

    $("article.transcript section section", html).each(function () {
        speakerName = $(this).find('h4.ng-binding').text().trim();

        let textObjs = []

        $("p", this).each(() => {
            let text = $(this).text().trim();
            let start = parseFloat($(this).attr('start-time').trim());
            let stop = parseFloat($(this).attr('stop-time').trim());
            let duration = Math.round((stop - start) * 100) / 100;

            textObjs.push({
                "text": text,
                "start": start,
                "stop": stop,
                "duration": stop - start,
            });

        }); // .each for paragraphs

        transcript.push({
            "speakerName": speakerName,
            "textObjs": textObjs
        });

    }); // .each for speaker

    return transcript;
} // getTranscript()

module.exports.scrapeOyez = scrapeOyez;

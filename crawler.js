const PUPPETEER = require('puppeteer');
const $ = require('cheerio');
// const WRITEFILE = require('write');
const fs = require('fs')
const fsPath = require('fs-path');

let ERRORLOG;

async function scrapeOyez(outputDir, {startYear = (new Date().getFullYear()), endYear = 1956, defaultTimeout = 30000} = {}) {
    console.log(`scrapeOyez running with parameters:`);
    console.log(`Start year: ${startYear}`);
    console.log(`End year: ${endYear}`);
    console.log(`Default timeout: ${defaultTimeout}`);
    if (!fs.existsSync('output')){
    fs.mkdirSync('output');
    }
    ERRORLOG = fs.createWriteStream(`${outputDir}/errors-${endYear}-${startYear}.txt`);
    process.stderr.write = ERRORLOG.write.bind(ERRORLOG);
    console.log(`Errors are now being written to: ${outputDir}errors-${endYear}-${startYear}.txt`);

    let results = [];
    const url = "https://www.oyez.org/cases";

    try {
        // ======= find all links to terms ============
        const browser = await PUPPETEER.launch({timeout: defaultTimeout});
        let page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector("div.full-sidebar");
        let html = await page.content();

        $('div.full-sidebar div.inner div ul#term-dropdown li', html).each(function () {
            link = $(this).find('a').attr('href');
            term = link.split("/")[1];
            link = `https://www.oyez.org/${link}`;
            console.log(`Found term: ${term}`);

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
        let message = `scrapeOyez(): Error occurred while finding URL's for individual terms: ${error}`
        console.log(message);
        console.error(message);
    }
}

/*
Scrapes all the cases of the page of a term
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
async function getCases(page, url, term, outputDir) {
    let cases = [];

    try{
        // goes to the term page
        await page.goto(url);
    } catch(error){
        let message = `getCases(): Unable to navigate to ${url}`;
        console.log(message);
        console.error(message);
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
                "caseLink": cases[x].caseLink,
            };

            // unpack values
            let additionalData = await getCaseTranscripts(page, cases[x].caseLink);
            Object.assign(tempCase, additionalData);

            // write file
            fsPath.writeFile(`${outputDir}${term}/${cases[x].caseName.replace(/\s/g, "_").replace("/", "+")}.js`, JSON.stringify(tempCase), (err) => {
              if(err) {
                console.log(err);
              } else {
                // file written successfully
              }
            });
        }
    } catch (error) {
        let message = `getCases(): An error ocurred for ${term}: ${error}`;
        console.log(message);
        console.error(message);
    }
}

// identifies the media links
// returns empty array if error
// also returns decidedBy, arguedOn, petitioner, and respondent
// returns array in form:
// [decidedBy, arguedOn, petitioner, respondent, caseTranscripts]
async function getCaseTranscripts(page, url) {
    let caseObj = {
        "caseTranscripts": [],
        "decidedBy": "",
        "arguedOn": "",
        "petitioner": "",
        "respondent": "",
        "docket": "",
        "citation": "",
        "justiaLink": "",
        "lowerCourt": ""
    };

    try {
        // goes to the case page
        await page.goto(url);
    } catch (error){
        let message = `getCaseTranscripts(): Unable to go to ${url}`;
        console.log(message);
        console.error(message);
    }

    try{
        // wait for the case name to load - gives an indication the page is loaded
        await page.waitForSelector("body > div > div > div.page.ng-scope > main > div > div > div > h1");
        let html = await page.content();
        // get decidedBy, arguedOn, petitioner, respondent
        caseObj.decidedBy = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Decided by';
        }).parent().text().replace('Decided by','').trim();

        caseObj.grantedOn = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Granted';
        }).parent().find('div').text().trim();

        caseObj.arguedOn = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Argued';
        }).parent().find('div').text().trim();

        caseObj.decidedOn = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Decided';
        }).parent().find('div').text().trim();

        caseObj.petitioner = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Petitioner';
        }).parent().text().replace('Petitioner','').trim();

        caseObj.respondent = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Respondent';
        }).parent().text().replace('Respondent','').trim();

        caseObj.docket = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Docket no.';
        }).parent().text().replace('Docket no.','').trim();

        caseObj.citation = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Citation';
        }).parent().text().replace('Citation','').trim();

        caseObj.justiaLink = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Citation';
        }).parent().find('a').attr('href');

        caseObj.lowerCourt = $('h3', html).filter(function() {
            return $(this).text().trim() === 'Lower court';
        }).parent().text().replace('Lower court','').trim();

        console.log(`Decided by: ${caseObj.decidedBy}`);
        console.log(`Granted on: ${caseObj.grantedOn}`);
        console.log(`Argued on: ${caseObj.arguedOn}`);
        console.log(`Decided on: ${caseObj.decidedOn}`);
        console.log(`Petitioner: ${caseObj.petitioner}`);
        console.log(`Respondent: ${caseObj.respondent}`);
        console.log(`Docket No.: ${caseObj.docket}`);
        console.log(`Citation: ${caseObj.citation}`);
        console.log(`Justia Link: ${caseObj.justiaLink}`);
        console.log(`Lower court: ${caseObj.lowerCourt}`);

    }catch (error){
        let message = `getCaseTranscripts(): Invalid page: ${url}. Error: ${error}`;
        console.log(message);
        console.error(message);
        return caseObj;
    }

    try {
        // wait for list of media to load
        await page.waitForSelector('body > div > div > div.page.ng-scope > main > div > div > div > div > div > div.media > ul')
        html = await page.content();

        // get the media links
        $("div.media ul li", html).each(function () {
            transcriptTitle = $(this).find('a').text().trim();
            transcriptLink = $(this).find('a').attr('iframe-url');

            if (transcriptTitle.includes("Oral Argument")) {
                // exclude non-oral arguments from being included in the parse

                caseObj.caseTranscripts.push({
                    "transcriptTitle": transcriptTitle,
                    "transcriptLink": transcriptLink,
                });
            } // if
        }); // .each

        // loop through transcripts for a case
        // gets the transcripts for each case and appends to case object
        // this is done outside of .each loop because
        // .each loop doesn't support async
        if(caseObj.caseTranscripts.length == 0){
            let message = `There is no media for this case (${url}).`;
            console.log(message);
            console.error(message);
        }else{
            for (let x = 0; x < caseObj.caseTranscripts.length; ++x) {
                console.log(`Case transcripts: ${x + 1}/${caseObj.caseTranscripts.length}: ${caseObj.caseTranscripts[x].transcriptTitle}`);
                caseObj.caseTranscripts[x].transcript = await getTranscript(page, caseObj.caseTranscripts[x].transcriptLink);
            }
        }

        return caseObj;

    } catch (error) {
        let message = `There is no media for this case (${url}): ${error}`;
        console.log(message);
        console.error(message);
        // if there is no media, just returns an empty list
        return caseObj;
    }

}


async function getTranscript(page, url) {
    let transcript = [];

    try {
        await page.goto(url); // opens up the transcript
    } catch (error){
        let message = `getTranscript(): Error occurred navigating to ${url}`;
        console.log(message);
        console.error(message);
        return transcript;
    }


    // wait for the first dialogue to load - indication it worked
    // can assume that all court transcripts will have at least one dialogue
    try {
        await page.waitForSelector("body > div.container > div > div > article > section:nth-child(3) > section:nth-child(1) > p");
    }catch (error){
        let message = `getTranscript: Unable to load transcript at ${url}`;
        console.log(message);
        console.error(message);
        return transcript;
    }
    let html = await page.content();

    console.log("Parsing transcript ...");

    $("article.transcript section section", html).each(function () {
        speakerName = $(this).find('h4.ng-binding').text().trim();

        let textObjs = []

        $(this).find("p").each(function() {
            let text = $(this).text().trim();
            let start = parseFloat($(this).attr('start-time').trim());
            let stop = parseFloat($(this).attr('stop-time').trim());
            let duration = Math.round((stop - start) * 100) / 100;

            textObjs.push({
                "text": text,
                "start": start,
                "stop": stop,
                "duration": duration,
            });

        }); // .each for paragraphs

        if(speakerName == ""){
            speakerName = "UNKNOWN";
        }

        transcript.push({
            "speakerName": speakerName,
            "textObjs": textObjs
        });

    }); // .each for speaker

    return transcript;
} // getTranscript()

module.exports.scrapeOyez = scrapeOyez;

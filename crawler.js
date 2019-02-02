const puppeteer = require('puppeteer');
const $ = require('cheerio');
var writeFile = require('write');

// class Scraper {
//     constructor(){
//
//         this.results = []
//     }
// }


/*
* transcripts is an array of objects in the form
this.results = [
    {
        term: "2018",
        termLink: "https://www.oyez.org/cases/2018"
        cases: [
            {
                caseName: "Air and Liquid Systems Corp. v. Devries",
                // caseFullName: "AIR AND LIQUID SYSTEMS CORP., ET AL., Petitioners, v. ROBERTA G. DeVRIES, INDIVIDUALLY AND AS ADMINISTRATRIX OF THE ESTATE OF JOHN B. DeVRIES, DECEASED, ET AL., Respondents"
                caseLink: "https://www.oyez.org/cases/2018/17-1104"
                caseTranscripts: [
                    {
                        transcriptTitle: "Oral Argument - October 10, 2018",
                        transcriptLink: "https://www.oyez.org/cases/2018/17-1104",
                        transcript: [
                            {
                                speakerName: "John G. Roberts, Jr.",
                                textObjs: [
                                    {
                                        text: "We'll hear argument next in Case 17-1104, Air and Liquid Systems versus DeVries. Mr. Dvoretzky.",
                                        start: 0,
                                        end: 7.48,
                                        duration: 7.48
                                    }
                                ]
                            }, // transcript[0]
                            {
                                speakerName: "Shay Dvoretzky",
                                textObjs: [
                                    {
                                        text: "Mr. Chief Justice, and may it please the Court: Petitioners had no duty to warn about asbestos added to their equipment years or even decades after its sale.",
                                        start: 7.48,
                                        end: 17.52,
                                        duration: 10.04
                                    }, // textObjs[0]
                                    {
                                        text: "That follows from a well-established tort law principle: manufacturers are not liable for injuries caused by third-party goods. That tort law principle --",
                                        start: 17.52,
                                        end: 26.64,
                                        duration: 9.12
                                    } // textObjs[1]
                                ] // textObjs
                            }, // transcript[1]
                        ] // transcript
                    } // caseTranscripts[0]
                ] // caseTranscripts
            }, // cases[0]
        ] // cases
    } // results[0]
] // results
*/


async function scrapeOyez() {
    let results = [];
    const url = "https://www.oyez.org/cases";

    try {
        // ======= find all links to terms ============
        const browser = await puppeteer.launch();
        let page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector("div.full-sidebar");
        let html = await page.content();

        $('div.full-sidebar div.inner div ul#term-dropdown li', html).each(function() {
            link = $(this).find('a').attr('href');
            term = link.split("/")[1];
            link = "https://www.oyez.org/" + link;
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
        for (let x = 0; x < results.length; ++x) {
            console.log("Term: " + (x+1) + "/" + results.length + ": " + results[x].term);
            await getCases(page, results[x].termLink, results[x].term);
            // cases = await getCases(page, results[x].termLink, results[x].term);
            // results[x].cases = await getCases(page, results[x].termLink);

            // for(y = 0; y < cases.length; ++y){
            //     cases[y].term = results[x].term;
            //     writeFile.sync("output/" + results[x].term + "/" + cases[y].caseName.replace(" ", "-") + ".js", JSON.stringify(cases[y]));
            // }
        }

        // close browser
        browser.close();
        // return results;

    } catch (error) {
        console.log("Error occurred while finding URL's for individual terms: ", error)
    }
}

// scrapes all the cases of the page of a term
// recieves url of the term page
// returns list of all cases on page
async function getCases(page, url, term) {
    let cases = [];
    await page.goto(url); // goes to the term page
    await page.waitForSelector("body > div > div > div.page.ng-scope > main > article > div > ng-include > ul > li:nth-child(1) > h2 > a");
    let html = await page.content();

    // caseName: "Air and Liquid Systems Corp. v. Devries",
    // caseFullName: "AIR AND LIQUID SYSTEMS CORP., ET AL., Petitioners, v. ROBERTA G. DeVRIES, INDIVIDUALLY AND AS ADMINISTRATRIX OF THE ESTATE OF JOHN B. DeVRIES, DECEASED, ET AL., Respondents"
    // caseLink: "https://www.oyez.org/cases/2018/17-1104"
    $("main article div ng-include ul li", html).each(function() {
        caseName = $(this).find('h2 a').text().trim();
        caseLink = "https://www.oyez.org/" + $(this).find('h2 a').attr('href');

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
        console.log("Cases: " + (x+1) + "/" + cases.length + ": " + cases[x].caseName);
        let tempCase = {"term": term, "caseName": cases[x].caseName, "caseLink": cases[x].caseLink};
        tempCase.caseTranscripts = await getCaseTranscripts(page, cases[x].caseLink);
        writeFile.sync("output/" + term + "/" + cases[x].caseName.replace(" ", "-") + ".js", JSON.stringify(tempCase));
    }

    // return cases;
}

// identifies the media links
// calls the
async function getCaseTranscripts(page, url) {
    let caseTranscripts = []
    await page.goto(url); // goes to the case page

    // wait for the case name to load - gives an indication the page is loaded
    await page.waitForSelector("body > div > div > div.page.ng-scope > main > div > div > div > h1");

    try {
        // wait for list of media to load
        await page.waitForSelector('body > div > div > div.page.ng-scope > main > div > div > div > div > div > div.media > ul')

        let html = await page.content();

        // get the media links
        $("div.media ul li", html).each(function() {
            transcriptTitle = $(this).find('a').text().trim();
            transcriptLink = $(this).find('a').attr('iframe-url');

            caseTranscripts.push({
                "transcriptTitle": transcriptTitle,
                "transcriptLink": transcriptLink,
            });
        });

        // loop through transcripts for a case
        // gets the transcripts for each case and appends to case object
        // this is done outside of .each loop because
        // .each loop doesn't support async
        for (let x = 0; x < caseTranscripts.length; ++x) {
            console.log("Case transcripts: " + (x+1) + "/" + caseTranscripts.length + ": " + caseTranscripts[x].transcriptTitle);
            // caseTranscripts[x].transcript = "Test transcript";
            caseTranscripts[x].transcript = await getTranscript(page, caseTranscripts[x].transcriptLink);
        }
        return caseTranscripts;

    } catch (error) {
        console.log("There is no media for this transcript.", error)
    }
    // if there is no media, just returns an empty list

}


async function getTranscript(page, url) {
    let transcript = [];

    await page.goto(url); // opens up the transcript

    // wait for the seventh dialogue to load - indication it worked
    // can assume that all court transcripts will have more than 7 dialogues
    await page.waitForSelector("body > div.container > div > div > article > section:nth-child(3) > section:nth-child(7) > p");
    let html = await page.content();
    console.log("Parsing transcript ...");
    $("article.transcript section section", html).each(function() {
        speakerName = $(this).find('h4.ng-binding').text().trim();

        $("article.transcript section section", html).each(function() {
            speakerName = $(this).find('h4.ng-binding').text().trim();

            let textObjs = []
            $("p", this).each(function() {
                let text = $(this).text().trim();
                let start = parseFloat($(this).attr('start-time').trim());
                let stop = parseFloat($(this).attr('stop-time').trim());
                let duration = Math.round((stop-start)*100)/100;
                textObjs.push({
                    "text": text,
                    "start": start,
                    "stop": stop,
                    "duration": stop-start,
                }); // textObjs.push
            }); // $("p", this).each
            transcript.push({
                "speakerName": speakerName,
                "textObjs": textObjs
            }); // transcript.push
        }); // $("article.transcript section section", html).each
    }); // $("article.transcript section section", html).each

    return transcript;
} // getTranscript()

// Psuedo code
/*
Loop through every term
  Loop through every case up to and including 1955-1956 Term
      Loop through all the media links
        Parse the transcript

Return object in form:
{
  {
    term: "2018",
    cases: [
      {
        caseName: Affronti v. United States
        argued: Nov 15, 1955
        decided: Dec 5, 1955
        citation: 350 US 79 (1955)
        petitioner: American Airlines, Inc.
        respondent: North American Airlines, Inc.
        docket: 410,
        court: Warren Court
        justices:
        transcript: [{
            speaker: "",
            text: "",
            startTime: "",
            endTime: "",
            duration: "",
        }]
      }
    ]
  }
}


// Justices JSON
/*
[{
  name: "",
  yearOfBirth: "",
  stateOfBirth: "",
  ethnicity: "",
  religion: "",
  motherProfessional: boolean, // whether the mother held a professional degree
  fatherProfessional: boolean, // whether the father held a professional degree
  commissioned: year,
  swornIn: year,
  appointedBy: president name,
  party:
  ruledLiberal: ['abortion rights', 'gay rights', 'federalism'],
  ruledConservative: [''], //
  seat: int,
  familyStatus: lower, lower-middle, middle, upper-middle, upper,
  reasonForLeaving: ,

}]


*/

module.exports.scrapeOyez = scrapeOyez;

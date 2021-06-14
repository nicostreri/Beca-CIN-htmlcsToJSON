#!/usr/bin/env node
const path = require("path");
const puppeteer = require("puppeteer");
const { Command } = require("commander");

/**
 * Execute HTML Code Sniffer on a page
 * @param {puppeteer.Page} page Page on which the accessibility test is run
 * @param {String} standardToRun Standard to test, it must be allowed by HTML CodeSniffer
 * @returns {Promise} Returns a promise which resolves with the accesibility results with: type, xpath to element, code, msg
 */
function runHTMLCodeSniffer(page, standardToRun) {
  return page.evaluate((standard) => {
    function getElementXPath(element) {
      //Based in https://stackoverflow.com/a/46781845/8087406
      if (!element) return null;

      if (element.id) {
        return `//*[@id="${element.id}"]`;
      } else if (element.tagName === "HEAD") {
        return "/html/head";
      } else if (element.tagName === "BODY") {
        return "/html/body";
      } else {
        const sameTagSiblings = Array.from(
          element.parentNode.childNodes
        ).filter((e) => e.nodeName === element.nodeName);
        const idx = sameTagSiblings.indexOf(element);
        return (
          getElementXPath(element.parentNode) +
          "/" +
          element.tagName.toLowerCase() +
          (sameTagSiblings.length > 1 ? `[${idx + 1}]` : "")
        );
      }
    }
    return new Promise((resolve, reject) => {
      HTMLCS.process(standard, window.document, (error) => {
        if (error) {
          return reject(error);
        }
        resolve(
          HTMLCS.getMessages().map((message) => {
            if (message.element == window.document) {
              message.element = "website";
              return message;
            }
            message.element = message.element
              ? getElementXPath(message.element)
              : "";
            return message;
          })
        );
      });
    });
  }, standardToRun);
}

/**
 * Prints for Console, the accessibility report in JSON format.
 * @param {HTMLCS.Message[]} results : List of results obtained from HTML CodeSniffer
 */
function processResults(results) {
  console.log(
    JSON.stringify({
      status: "ok",
      results: results,
    })
  );
}

/**
 * Print to console the exceptions that occur during the accessibility scan
 * @param {Error} error A exception caught
 */
function processError(error) {
  console.log(
    JSON.stringify({
      status: "fail",
      message: error.message,
    })
  );
  process.exit(1);
}

//--- MAIN ----//
//Usage and arguments parser
const program = new Command();
program
  .name("htmlcsToJSON")
  .version("0.0.1")
  .option(
    "-s, --standard <standard>",
    "Standard to analyze: Section508, WCAG2A, WCAG2AA, WCAG2AAA",
    "WCAG2AA"
  )
  .requiredOption("-u, --url <url>", "URL to analyze");
program.parse(process.argv);

const options = program.opts();
const url = options.url;
const standard = options.standard;
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.addScriptTag({
    path: path.resolve(
      `${__dirname}/../node_modules/html_codesniffer/build/HTMLCS.js`
    ),
  });
  const results = await runHTMLCodeSniffer(page, standard);
  await browser.close();
  return results;
})()
  .then(processResults)
  .catch(processError);

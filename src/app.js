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
    /**
     * Check if an element is an element node.
     * @param {Node} element - An element to check.
     * @returns {Boolean} True if the element is an element node.
     */
    function isElementNode(element) {
      return element.nodeType === Node.ELEMENT_NODE;
    }

    /**
     * Get a CSS selector for an element.
     * @param {HTMLElement} element - An element to get a selector for.
     * @param {Array} parts
     * @returns {String} Returns the CSS selector as a string.
     */
    function getElementSelector(element, parts = []) {
      if (isElementNode(element)) {
        parts.unshift(getElementIdentifier(element));

        if (element.parentNode) {
          return getElementSelector(element.parentNode, parts);
        }
      }
      return parts.join(" > ");
    }

    /**
     * CSS element identifier.
     * @param {HTMLElement} element - An HTML element
     * @returns {String} Returns the CSS element identifier as a string.
     */
    function getElementIdentifier(element) {
      let identifier = element.tagName.toLowerCase();
      if (!element.parentNode) {
        return identifier;
      }
      const siblingElements = [...element.parentNode.childNodes].filter(
        isElementNode
      );
      const hasSiblingsWithSameTag =
        siblingElements.filter((e) => {
          return e != element && e.tagName === element.tagName;
        }).length > 0;

      const nthChild = siblingElements.indexOf(element);
      if (hasSiblingsWithSameTag && nthChild !== -1) {
        identifier += `:nth-child(${nthChild + 1})`;
      }
      return identifier;
    }

    return new Promise((resolve, reject) => {
      HTMLCS.process(standard, window.document, (error) => {
        if (error) {
          return reject(error);
        }
        resolve(
          HTMLCS.getMessages().map((message) => {
            message.element = getElementSelector(message.element) || "html";
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
  const browser = await puppeteer.launch({
    dumpio: false,
    args: ["--no-sandbox"],
  });
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

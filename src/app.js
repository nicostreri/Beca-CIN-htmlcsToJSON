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
    function getQuerySelector(elem) {
      //Based in https://stackoverflow.com/a/48081741/8087406
      var element = elem;
      var str = "";

      if (element == window.document) return "website";

      function loop(element) {
        // stop here = element is body
        if (document === element) {
          str = str.replace(/^/, "");
          str = str.replace(/\s/, "");
          str = str.replace(/\s/g, " > ");
          return str;
        }
        // stop here = element has ID
        if (element.getAttribute("id")) {
          str = str.replace(/^/, " #" + element.getAttribute("id"));
          str = str.replace(/\s/, "");
          str = str.replace(/\s/g, " > ");
          return str;
        }

        // stop here = element is body
        if (document.body === element) {
          str = str.replace(/^/, " body");
          str = str.replace(/\s/, "");
          str = str.replace(/\s/g, " > ");
          return str;
        }

        // concat all classes in "queryselector" style
        if (element.getAttribute("class")) {
          var elemClasses = ".";
          elemClasses += element.getAttribute("class");
          elemClasses = elemClasses.replace(/\s/g, ".");
          elemClasses = elemClasses.replace(/^/g, " ");
          var classNth = "";

          // check if element class is the unique child
          var childrens = element.parentNode.children;

          if (childrens.length < 2) {
            return;
          }

          var similarClasses = [];

          for (let children of childrens) {
            if (
              element.getAttribute("class") == children.getAttribute("class")
            ) {
              similarClasses.push(children);
            }
          }

          if (similarClasses.length > 1) {
            for (var j = 0; j < similarClasses.length; j++) {
              if (element === similarClasses[j]) {
                j++;
                classNth = ":nth-of-type(" + j + ")";
                break;
              }
            }
          }

          str = str.replace(/^/, elemClasses + classNth);
        } else {
          // get nodeType
          var name = element.nodeName;
          name = name.toLowerCase();
          var nodeNth = "";

          var childrens = element.parentNode.children;

          if (childrens.length > 2) {
            var similarNodes = [];

            for (let children of childrens) {
              if (element.nodeName == children.nodeName) {
                similarNodes.push(children);
              }
            }

            if (similarNodes.length > 1) {
              for (var j = 0; j < similarNodes.length; j++) {
                if (element === similarNodes[j]) {
                  j++;
                  nodeNth = ":nth-of-type(" + j + ")";
                  break;
                }
              }
            }
          }

          str = str.replace(/^/, " " + name + nodeNth);
        }

        if (element.parentNode) {
          loop(element.parentNode);
        } else {
          str = str.replace(/\s/g, " > ");
          str = str.replace(/\s/, "");
          return str;
        }
      }

      loop(element);

      return str;
    }
    return new Promise((resolve, reject) => {
      HTMLCS.process(standard, window.document, (error) => {
        if (error) {
          return reject(error);
        }
        resolve(
          HTMLCS.getMessages().map((message) => {
            message.element = getQuerySelector(message.element);
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
  const browser = await puppeteer.launch({ dumpio: false });
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

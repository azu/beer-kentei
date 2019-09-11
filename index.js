const fs = require("fs");
const path = require("path");
const contents = require("./data/contents");
const mondai = contents.reverse().filter(content => /3級/i.test(content.title)).map(content => {
    return `## [${content.title}](${content.url})

${content.questionMarkdown}

----

${content.answerMarkdown}

`;

}).join("\n");
fs.writeFileSync("3.md", mondai, "utf-8");

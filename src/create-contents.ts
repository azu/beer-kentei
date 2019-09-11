import puppeteer from "puppeteer";
import index from "../data/index.json";

import TurndownService from "turndown";
import * as fs from "fs";
import * as path from "path";

const outputFilePath = path.join(__dirname, "../data/contents.json");
const turndownService = new TurndownService();
const fetchQuestionPage = async (page: puppeteer.Page): Promise<string> => {
    return await page.evaluate(() => {
        // remove unneeded
        const paginate = document.querySelector(".paginate");
        if (paginate) {
            paginate.remove();
        }
        const fontTags = document.querySelectorAll("p > font");
        const targetFont = Array.from(fontTags).find(e => {
            if (!e.textContent) {
                return;
            }
            return e.textContent.includes("正解と解説は次のページをご覧ください");
        });
        if (targetFont) {
            if (targetFont.parentElement && targetFont.parentElement.parentElement) {
                targetFont.parentElement.parentElement.remove();
            } else if (targetFont.parentElement) {
                targetFont.parentElement.remove();
            } else {
                targetFont.remove();
            }
        }
        const content = document.querySelector(".postWrap");
        if (!content) {
            return "";
        }
        return content.outerHTML;
    });
};
const fetchAnswerPage = async (page: puppeteer.Page): Promise<string> => {
    return await page.evaluate(() => {
        // remove unneeded
        const paginate = document.querySelector(".paginate");
        if (paginate) {
            paginate.remove();
        }
        const content = document.querySelector(".postWrap");
        if (!content) {
            return "";
        }
        return content.outerHTML;
    });
};

const scrapePage = async (browser: puppeteer.Browser, url: string):
    Promise<{ question: string; answer: string; answerMarkdown: string; questionMarkdown: string; } | null> => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const nextURL = await page.evaluate(() => {
        const link: HTMLAnchorElement | null = document.querySelector(`a[rel="next"]`);
        const nextURL = link && link.href;
        if (!nextURL) {
            return null;
        }
        // ignore #
        if (/^https?:/.test(nextURL) && !/#$/.test(nextURL)) {
            return nextURL;
        }
        return null;
    });
    const question = await fetchQuestionPage(page);
    if (!nextURL) {
        // not found answer
        return null;
    }
    await page.goto(nextURL, { waitUntil: "domcontentloaded" });
    const answer = await fetchAnswerPage(page);
    return {
        answer,
        question,
        answerMarkdown: turndownService.turndown(answer).split("\n").filter(text => {
            if (text.includes("過去問は下記リンク") ||
                text.includes("過去問と予想問題をチェック！") ||
                text.includes("過去問リンク") ||
                text.includes("びあけん対策に…ビール最新情報をチェック！") ||
                text.includes("びあけん対策に…ビール最新情報をチェック！") ||
                text.includes("ビール業界情報館はこちら") ||
                text.includes("過去問集はこちらから") ||
                text.includes("予想問題集はこちらから")) {
                return false;
            }
            return true;
        }).join("\n"),
        questionMarkdown: turndownService.turndown(question)
    };
};
puppeteer.launch().then(async browser => {
    const results = [];
    for (const { url, title } of index) {
        console.log(url);
        const res = await scrapePage(browser, url);
        if (!res) {
            continue;
        }
        const { answer, answerMarkdown, question, questionMarkdown } = res;
        results.push({
            title,
            url,
            answer,
            answerMarkdown,
            question,
            questionMarkdown
        });
    }
    fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 4), "utf-8");

    browser.close();
});

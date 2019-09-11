import puppeteer from "puppeteer";
import * as path from "path";

const outputFilePath = path.join(__dirname, "../data/index.json");
const START_URL = "https://beerpalette.jp/category/%E6%97%A5%E6%9C%AC%E3%83%93%E3%83%BC%E3%83%AB%E6%A4%9C%E5%AE%9A%EF%BC%88%E3%81%B3%E3%81%82%E3%81%91%E3%82%93%EF%BC%89";
type Article = {
    title: string;
    url: string;
}
const fetchArticle = async (page: puppeteer.Page): Promise<Article[]> => {
    const articles = await page.evaluate(() => {
        return Array.from<HTMLAnchorElement, Article>(document.querySelectorAll(".postEx h3 a"),
            element => {
                return { url: element.href, title: element.textContent || "" };
            });
    });
    return articles;
};
const scrapePage = async (browser: puppeteer.Browser, url: string):
    Promise<{ articles: Article[], nextURL: string | null }> => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const articles = await fetchArticle(page);
    const nextURL = await page.evaluate(() => {
        const link: HTMLAnchorElement | null = document.querySelector(`a[rel="next"]`);
        return link && link.href;
    });
    return {
        articles,
        nextURL
    };
};
puppeteer.launch().then(async browser => {
    let pageURL: string | null = START_URL;
    const allArticles: Article[] = [];
    while (pageURL) {
        const { articles, nextURL } = await scrapePage(browser, pageURL);
        allArticles.push(...articles);
        pageURL = nextURL as string | null;
    }
    browser.close();
});

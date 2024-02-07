import RSSParser from 'rss-parser';
import pkg from '@atproto/api';
import * as dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as process from 'process';

// Import BskyAgent via default export
const { BskyAgent, RichText } = pkg;

// Configure dotenv
dotenv.config();

// Specify arXiv RSS URL
const arxivURL = 'http://export.arxiv.org/rss/astro-ph.ga';

// Instantiate RSSParser
const parser = new RSSParser();

// Async sleep function
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// Async parse function
const parse = async url => {
    const feed = await parser.parseURL(url);

    /*
    DEVELOPMENT
    */
    // console.log(feed.title);
    // console.log(feed.items.length)
    // feed.items.forEach(item => {
    //     console.log(`Article: ${item.title}\n\narXiv URL: ${item.link}`)
    // })

    /*
    PRODUCTION
    */
    // Instantiate feedArray
    var feedArray = [];
    // Iterate over feed.items and push to feedArray
    feed.items.forEach(item => {
        feedArray.push(`${item.title}\n${item.link}`
        );
    });
    return feedArray;
}

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
  });

async function main() {
    await agent.login({ identifier: process.env.BLUESKY_USERNAME, password: process.env.BLUESKY_PASSWORD});

    // Return articles from parse function
    const articles = await parse(arxivURL);

    // Iterate through articles and post each to Bluesky
    for(const article of articles){
        // Convert article text to RichText
        const rt = new RichText({text: article});

        await rt.detectFacets(agent); // automatically detects mentions and links

        // Create postRecord
        const postRecord = {
            $type: 'app.bsky.feed.post',
            text: rt.text,
            facets: rt.facets,
            createdAt: new Date().toISOString(),
          };

        // Post
        console.log('Posting...');
        agent.post(postRecord);

        // Wait
        await sleep(1000);

        // Confirm post
        console.log('\nPosted! Waiting to post next article...\n');
    };

    // 
    console.log("Finished posted today's articles!");
}

main();

// // Run this on a cron job
// const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
// const scheduleExpression = '0 */24 * * *'; // Run once per day

// const job = new CronJob(scheduleExpression, main); // change to scheduleExpressionMinute for testing

// job.start();

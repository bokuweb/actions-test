import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import axios from "axios";

const cheerio = require("cheerio");

const token = core.getInput("secret");

const octokit = new github.GitHub(token);

const { repo } = github.context;

let event;
try {
  if (process.env.GITHUB_EVENT_PATH) {
    event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  }
} catch (e) {}

if (!event) {
  throw new Error("Failed to get github event.json..");
}

let succeeded = false;

const run = async () => {
  const currentHash =
    event.after ||
    (event.pull_request &&
      event.pull_request.head &&
      event.pull_request.head.sha);

  const [owner, reponame] = event.repository.full_name.split("/");
  const url = `https://github.com/${owner}/${reponame}/commit/${currentHash}`;

  const { data } = await axios(url);
  const $ = cheerio.load(data);
  $("a").each(async (i, elem) => {
    if ($(elem).text() === "my-artifact") {
      const href = $(elem)[0].attribs.href;
      console.log("href", href);
      await octokit.issues.createComment({
        ...repo,
        number: event.number,
        body: `https://bokuweb.github.io/reg-actions-playground/?${encodeURIComponent(
          href
        )}`
      });
      succeeded = true;
    }
  });
};

for (let i = 0; i < 3; i++) {
  if (!succeeded) {
    setTimeout(async () => {
      await run();
    }, i * 1000);
  }
}

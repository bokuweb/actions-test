"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const cheerio = require("cheerio");
const token = core.getInput("secret");
const octokit = new github.GitHub(token);
const { repo } = github.context;
let event;
try {
    if (process.env.GITHUB_EVENT_PATH) {
        event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    }
}
catch (e) { }
if (!event) {
    throw new Error("Failed to get github event.json..");
}
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentHash = event.after ||
        (event.pull_request &&
            event.pull_request.head &&
            event.pull_request.head.sha);
    console.log("current hash", currentHash);
    const [owner, reponame] = event.repository.full_name.split("/");
    const url = `https://github.com/${owner}/${reponame}/commit/${currentHash}`;
    console.log("checks url", url);
    const { data } = yield axios_1.default(url);
    const $ = cheerio.load(data);
    $("a").each((i, elem) => __awaiter(void 0, void 0, void 0, function* () {
        if ($(elem).text() === "my-artifact") {
            const href = $(elem)[0].attribs.href;
            console.log("href", href);
            yield octokit.issues.createComment(Object.assign(Object.assign({}, repo), { number: event.number, body: `https://bokuweb.github.io/reg-actions-playground/?${encodeURIComponent(href)}` }));
        }
    }));
});
run();

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
const path = __importStar(require("path"));
const make_dir_1 = __importDefault(require("make-dir"));
const axios_1 = __importDefault(require("axios"));
const token = core.getInput("secret");
const octokit = new github.GitHub(token);
const repoInfo = github.context.repo;
let event;
try {
    if (process.env.GITHUB_EVENT_PATH) {
        event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    }
}
catch (e) { }
console.log(event);
if (!event) {
    throw new Error("Failed to get github event.json");
}
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const heads = yield octokit.git.listRefs(Object.assign({}, repoInfo));
    const branches = yield octokit.repos.listBranches(repoInfo);
    console.log("branches", branches.data);
    const contents = yield octokit.repos.getContents(Object.assign(Object.assign({}, repoInfo), { path: "test", ref: "gh-pages" }));
    console.log("contents", contents);
    /*
        {
        name: 'open .png',
        path: 'test/open .png',
        sha: '62aeef103df7a3206992a9c9e742af414c7146e6',
        size: 300852,
        url: 'https://api.github.com/repos/bokuweb/actions-test/contents/test/open%20.png?ref=gh-pages',
        html_url: 'https://github.com/bokuweb/actions-test/blob/gh-pages/test/open%20.png',
        git_url: 'https://api.github.com/repos/bokuweb/actions-test/git/blobs/62aeef103df7a3206992a9c9e742af414c7146e6',
        download_url: 'https://raw.githubusercontent.com/bokuweb/actions-test/gh-pages/test/open%20.png',
        type: 'file',
        _links: [Object]
      }
      */
    yield Promise.all((contents.data || []).map(file => {
        return axios_1.default({
            method: "get",
            url: file.download_url,
            // responseType: "stream"
            responseType: "arraybuffer"
        }).then(response => {
            const p = path.join("./expected", file.path);
            make_dir_1.default.sync(path.dirname(p));
            // let blob = new Blob([response.data], { type: "image/png" });
            fs.writeFileSync(p, Buffer.from(response.data, "binary"));
            //response.data.pipe(fs.createWriteStream(p));
        });
    }));
    //   console.log(
    //     fs.readFileSync(path.join("./expected", contents.data[1].path), "utf-8")
    //   );
    console.log("download complete");
    let head = heads.data[0];
    const headCommit = yield octokit.git.getCommit(Object.assign(Object.assign({}, repoInfo), { commit_sha: head.object.sha }));
    console.log("head", head);
    //
    // Get branch if not exist create one.
    const branch = yield octokit.repos
        .getBranch(Object.assign(Object.assign({}, repoInfo), { branch: "gh-pages" }))
        .catch(e => {
        console.log(e);
        return null;
    });
    if (!branch)
        return;
    console.log("branch", branch);
    const ref = branch
        ? branch.data.name
        : (yield octokit.git.createRef(Object.assign(Object.assign({}, repoInfo), { ref: "refs/heads/gh-pages", sha: headCommit.data.sha }))).data.ref;
    console.log(ref);
    const image = fs.readFileSync(path.join("./expected", contents.data[1].path));
    // convert binary data to base64 encoded string
    const content = Buffer.from(image).toString("base64");
    console.log(content);
    const blob = yield octokit.git.createBlob(Object.assign(Object.assign({}, repoInfo), { content, encoding: "base64" }));
    let tree = yield octokit.git.getTree(Object.assign(Object.assign({}, repoInfo), { tree_sha: branch.data.commit.sha, recursive: 1 }));
    // tree.data.tree.pop();
    // tree.data.tree.push({
    //   path: "image222",
    //   mode: "100644",
    //   type: "blob",
    //   sha: blob.data.sha
    // });
    const newTree = yield octokit.git.createTree(Object.assign(Object.assign({}, repoInfo), { tree: [
            // ...tree.data.tree,
            {
                path: "image2.png",
                mode: "100644",
                type: "blob",
                sha: blob.data.sha
            }
        ] }));
    const newCommit = yield octokit.git.createCommit(Object.assign(Object.assign({}, repoInfo), { tree: newTree.data.sha, message: "Test", parents: [branch.data.commit.sha] }));
    yield octokit.git.updateRef(Object.assign(Object.assign({}, repoInfo), { ref: `heads/${ref}`, sha: newCommit.data.sha }));
    console.log("done");
});
// if (typeof event.number !== "undefined" && event.pull_request) {
run();
//}

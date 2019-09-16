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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
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
    const branch = yield octokit.repos.getBranch(Object.assign(Object.assign({}, repoInfo), { branch: "gh-pages" }));
    console.log(branch);
    if (!branch) {
    }
    const blob = yield octokit.git.createBlob(Object.assign(Object.assign({}, repoInfo), { content: "Hello" }));
    const heads = yield octokit.git.listRefs(Object.assign({}, repoInfo));
    let head = heads.data[0];
    const headCommit = yield octokit.git.getCommit(Object.assign(Object.assign({}, repoInfo), { commit_sha: head.object.sha }));
    let tree = yield octokit.git.getTree(Object.assign(Object.assign({}, repoInfo), { tree_sha: headCommit.data.tree.sha, recursive: 1 }));
    const ref = yield octokit.git.createRef(Object.assign(Object.assign({}, repoInfo), { ref: "refs/heads/gh-pages-d2", sha: headCommit.data.sha }));
    // tree.data.tree.pop();
    tree.data.tree.push({
        path: "aaaaaaasad",
        mode: "100644",
        type: "blob",
        sha: blob.data.sha
    });
    const newTree = yield octokit.git.createTree(Object.assign(Object.assign({}, repoInfo), { tree: [
            {
                path: "aaaaaaasad",
                mode: "100644",
                type: "blob",
                sha: blob.data.sha
            }
        ] }));
    const newCommit = yield octokit.git.createCommit(Object.assign(Object.assign({}, repoInfo), { tree: newTree.data.sha, message: "Test", parents: [headCommit.data.sha] }));
    yield octokit.git.updateRef(Object.assign(Object.assign({}, repoInfo), { ref: ref.data.ref.replace("refs/", ""), sha: newCommit.data.sha }));
    console.log("done");
});
if (typeof event.number !== "undefined" && event.pull_request) {
    run();
}

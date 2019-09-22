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
            responseType: "stream"
        }).then(response => {
            const p = path.join("/expected", file.path);
            make_dir_1.default.sync(p);
            response.data.pipe(fs.createWriteStream(p));
        });
    }));
    console.log(fs.readFileSync(path.join("/expected", "open .png", "utf-8")));
    console.log("download complete");
    let head = heads.data[0];
    const headCommit = yield octokit.git.getCommit(Object.assign(Object.assign({}, repoInfo), { commit_sha: head.object.sha }));
    console.log("head", head);
    //
    // Get branch if not exist create one.
    // const branch = await octokit.repos
    //   .getBranch({
    //     ...repoInfo,
    //     branch: "gh-pages"
    //   })
    //   .catch(e => {
    //     console.log(e);
    //     return null;
    //   });
    // console.log("branch", branch);
    /*
    const ref = branch
      ? branch.data.name
      : (await octokit.git.createRef({
          ...repoInfo,
          ref: "refs/heads/gh-pages",
          sha: headCommit.data.sha
        })).data.ref;
  
    console.log(ref);
  
    const blob = await octokit.git.createBlob({
      ...repoInfo,
      content: "Hello"
    });
  
    let tree = await octokit.git.getTree({
      ...repoInfo,
      tree_sha: headCommit.data.tree.sha,
      recursive: 1
    });
  
    // tree.data.tree.pop();
    tree.data.tree.push({
      path: "aaaaaaasad",
      mode: "100644",
      type: "blob",
      sha: blob.data.sha
    });
  
    const newTree = await octokit.git.createTree({
      ...repoInfo,
      tree: [
        {
          path: "aaaaaaasad",
          mode: "100644",
          type: "blob",
          sha: blob.data.sha
        }
      ]
    });
  
    const newCommit = await octokit.git.createCommit({
      ...repoInfo,
      tree: newTree.data.sha,
      message: "Test",
      parents: [headCommit.data.sha]
    });
  
    await octokit.git.updateRef({
      ...repoInfo,
      ref: ref.replace("refs/", ""),
      sha: newCommit.data.sha
    });
    */
    console.log("done");
});
// if (typeof event.number !== "undefined" && event.pull_request) {
run();
//}

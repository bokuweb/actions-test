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
const myToken = core.getInput("secret");
core.debug(myToken);
const octokit = new github.GitHub(myToken);
const repoInfo = github.context.repo;
console.log(repoInfo);
core.debug(JSON.stringify(repoInfo));
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const blob = yield octokit.git.createBlob(Object.assign(Object.assign({}, repoInfo), { content: "Hello" }));
    const heads = yield octokit.git.listRefs(Object.assign(Object.assign({}, repoInfo), { namespace: "heads/" }));
    console.log(heads);
    console.log("++blob", blob);
    let head = heads.data[0];
    console.log(`Test ${head.ref}`);
    const headCommit = yield octokit.git.getCommit(Object.assign(Object.assign({}, repoInfo), { commit_sha: head.object.sha }));
    console.log(headCommit);
    let tree = yield octokit.git.getTree(Object.assign(Object.assign({}, repoInfo), { tree_sha: headCommit.data.tree.sha, recursive: 1 }));
    console.log("+++++");
    // console.log(tree);
    // for (let object of tree.data.tree) {
    //   core.debug(`  Test ${object.path}`);
    //   object.sha = blob.data.sha;
    // }
    console.log(tree.data.tree[0]);
    console.log(tree.data.tree[1]);
    console.log(tree.data.tree[2]);
    // const n = tree.data.tree.push({
    //   path: ".github",
    //   mode: "100644",
    //   type: "blob",
    //   sha: blob.data.sha,
    //   url: blob.data.url,
    //   content: "hello"
    // });
    // console.log("=", n);
    let a = tree.data.tree.pop();
    console.log(a);
    const b = yield octokit.repos.createOrUpdateFile(Object.assign(Object.assign({}, repoInfo), { path: "aaa/bbab", message: "test", content: "SGVsbG8=" }));
    console.log("===============b", b);
    yield octokit.repos.deleteFile(Object.assign(Object.assign({}, repoInfo), { path: "aaa", message: "test", sha: b.data.commit.sha }));
    console.log("===============asdaa==");
    const newTree = yield octokit.git.createTree(Object.assign(Object.assign({}, repoInfo), { tree: [a] }));
    console.log("=1");
    const newCommit = yield octokit.git.createCommit(Object.assign(Object.assign({}, repoInfo), { tree: newTree.data.sha, message: "Test", parents: [headCommit.data.sha] }));
    yield octokit.git.updateRef(Object.assign(Object.assign({}, repoInfo), { ref: head.ref, sha: newCommit.data.sha }));
});
run();

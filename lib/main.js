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
const github = require("@actions/github");
const core = require("@actions/core");
const reg = require("reg-cli");
const myToken = core.getInput("secret");
const octokit = new github.GitHub(myToken);
const repoInfo = github.context.repo;
console.log(myToken);
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const blob = yield octokit.git.createBlob(Object.assign(Object.assign({}, repoInfo), { content: "Hello" }));
    const heads = yield octokit.git.listRefs(Object.assign(Object.assign({}, repoInfo), { namespace: "heads/" }));
    for (let head of heads.data) {
        core.debug(`Test ${head.ref}`);
        const headCommit = yield octokit.git.getCommit(Object.assign(Object.assign({}, repoInfo), { commit_sha: head.object.sha }));
        let tree = yield octokit.git.getTree(Object.assign(Object.assign({}, repoInfo), { tree_sha: headCommit.data.tree.sha, recursive: 1 }));
        console.log(tree);
        core.info(tree);
        for (let object of tree.data.tree) {
            core.debug(`  Test ${object.path}`);
            object.sha = blob.data.sha;
        }
        const newTree = yield octokit.git.createTree(Object.assign(Object.assign({}, repoInfo), { tree: tree.data.tree }));
        const newCommit = yield octokit.git.createCommit(Object.assign(Object.assign({}, repoInfo), { tree: newTree.data.sha, message: "Test", parents: [headCommit.data.sha] }));
        yield octokit.git.updateRef(Object.assign(Object.assign({}, repoInfo), { ref: head.ref, sha: newCommit.data.sha }));
    }
});
run();

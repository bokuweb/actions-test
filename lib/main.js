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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const myInput = core.getInput("myInput");
            core.debug(`Hello ${myInput}`);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
/*
const github = require("@actions/github");
const core = require("@actions/core");
const reg = require("reg-cli");

const myToken = core.getInput("myToken");

const octokit = new github.GitHub(myToken);

const repoInfo = github.context.repo;

console.log(myToken);

const run = async () => {
  const blob = await octokit.git.createBlob({ ...repoInfo, content: "Hello" });
  const heads = await octokit.git.listRefs({
    ...repoInfo,
    namespace: "heads/"
  });

  for (let head of heads.data) {
    core.debug(`Test ${head.ref}`);
    const headCommit = await octokit.git.getCommit({
      ...repoInfo,
      commit_sha: head.object.sha
    });
    let tree = await octokit.git.getTree({
      ...repoInfo,
      tree_sha: headCommit.data.tree.sha,
      recursive: 1
    });

    console.log(tree);
    core.info(tree);
    for (let object of tree.data.tree) {
      core.debug(`  Test ${object.path}`);
      object.sha = blob.data.sha;
    }

    const newTree = await octokit.git.createTree({
      ...repoInfo,
      tree: tree.data.tree
    });
    const newCommit = await octokit.git.createCommit({
      ...repoInfo,
      tree: newTree.data.sha,
      message: "Test",
      parents: [headCommit.data.sha]
    });
    await octokit.git.updateRef({
      ...repoInfo,
      ref: head.ref,
      sha: newCommit.data.sha
    });
  }
};

run();

*/

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";

const token = core.getInput("secret");

const octokit = new github.GitHub(token);

const repoInfo = github.context.repo;

let event;
try {
  if (process.env.GITHUB_EVENT_PATH) {
    event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  }
} catch (e) {}

console.log(event);

if (!event) {
  throw new Error("Failed to get github event.json");
}

const run = async () => {
  const heads = await octokit.git.listRefs({
    ...repoInfo
  });

  const branches = await octokit.repos.listBranches(repoInfo);

  console.log(branches);

  let head = heads.data[0];
  const headCommit = await octokit.git.getCommit({
    ...repoInfo,
    commit_sha: head.object.sha
  });

  const branch = await octokit.repos
    .getBranch({
      ...repoInfo,
      branch: "gh-pages"
    })
    .catch(e => {
      console.log(e);
      return null;
    });

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
  console.log("done");
};

// if (typeof event.number !== "undefined" && event.pull_request) {
run();
//}

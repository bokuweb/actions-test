import * as core from "@actions/core";
import * as github from "@actions/github";

const myToken = core.getInput("secret");

core.debug(myToken);

const octokit = new github.GitHub(myToken);

const repoInfo = github.context.repo;

console.log(repoInfo);
core.debug(JSON.stringify(repoInfo));

const run = async () => {
  const blob = await octokit.git.createBlob({ ...repoInfo, content: "Hello" });
  const heads = await octokit.git.listRefs({
    ...repoInfo,
    namespace: "heads/"
  });
  console.log(heads);
  console.log("++blob", blob);

  for (let head of heads.data) {
    console.log(`Test ${head.ref}`);
    const headCommit = await octokit.git.getCommit({
      ...repoInfo,
      commit_sha: head.object.sha
    });
    let tree = await octokit.git.getTree({
      ...repoInfo,
      tree_sha: headCommit.data.tree.sha,
      recursive: 1
    });

    console.log("+++++");
    // console.log(tree);

    // for (let object of tree.data.tree) {
    //   core.debug(`  Test ${object.path}`);
    //   object.sha = blob.data.sha;
    // }

    console.log(tree.data.tree[0]);

    const n = tree.data.tree.push(blob.data);
    console.log("=", n);
    const newTree = await octokit.git.createTree({
      ...repoInfo,
      tree: tree.data.tree
    });
    console.log("=1");
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

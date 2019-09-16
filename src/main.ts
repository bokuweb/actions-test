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

  let head = heads.data[0];
  console.log(`Test ${head.ref}`);
  const headCommit = await octokit.git.getCommit({
    ...repoInfo,
    commit_sha: head.object.sha
  });

  console.log(headCommit);

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

  const b = await octokit.repos.createFile({
    ...repoInfo,
    path: "aaa/bbb",
    message: "test",
    content: "SGVsbG8="
  });

  await octokit.repos.deleteFile({
    ...repoInfo,
    path: "aaa",
    message: "test",
    sha: b.data.commit.sha
  });

  const newTree = await octokit.git.createTree({
    ...repoInfo,
    tree: [a]
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
};

run();

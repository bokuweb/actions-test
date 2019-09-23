import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as path from "path";
import glob from "glob";
import mkdir from "make-dir";
import cpx from "cpx";
import axios from "axios";

const compare = require("reg-cli");

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

  console.log("branches", branches.data);

  const contents = await octokit.repos
    .getContents({
      ...repoInfo,
      path: "test",
      ref: "gh-pages"
    })
    .catch(() => {
      return { data: [] };
    });

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
  await Promise.all(
    (contents.data || []).map(file => {
      return axios({
        method: "get",
        url: file.download_url,
        // responseType: "stream"
        responseType: "arraybuffer"
      }).then(response => {
        const p = path.join("./report/expected", file.path);
        mkdir.sync(path.dirname(p));
        // let blob = new Blob([response.data], { type: "image/png" });
        fs.writeFileSync(p, Buffer.from(response.data, "binary"));
        //response.data.pipe(fs.createWriteStream(p));
      });
    })
  );

  //   console.log(
  //     fs.readFileSync(path.join("./expected", contents.data[1].path), "utf-8")
  //   );
  console.log("download complete");

  let head = heads.data[0];
  const headCommit = await octokit.git.getCommit({
    ...repoInfo,
    commit_sha: head.object.sha
  });

  console.log("head", head);

  //
  // Get branch if not exist create one.
  let branch = await octokit.repos
    .getBranch({
      ...repoInfo,
      branch: "gh-pages"
    })
    .catch(e => {
      console.log(e);
      return null;
    });

  if (!branch) return;

  console.log("branch", branch);

  const ref = branch
    ? branch.data.name
    : (await octokit.git.createRef({
        ...repoInfo,
        ref: "refs/heads/gh-pages",
        sha: headCommit.data.sha
      })).data.ref;

  console.log(ref);

  cpx.copySync(`./actual/**/*.{png,jpg,jpeg,tiff,bmp,gif}`, "./report/actual");
  const emitter = compare({
    actualDir: "./report/actual",
    expectedDir: "./report/expected",
    diffDir: "./report/diff",
    json: "./report/reg.json",
    report: "./report/index.html",
    update: false,
    ignoreChange: true,
    urlPrefix: ""
  });
  emitter.on("compare", (compareItem: { type: string; path: string }) => {
    console.log(compareItem);
  });

  // const image = fs.readFileSync(path.join("./expected", contents.data[1].path));
  // const content = Buffer.from(image).toString("base64");

  // console.log(content);

  // const blob = await octokit.git.createBlob({
  //   ...repoInfo,
  //   content,
  //   encoding: "base64"
  // });

  let tree = await octokit.git.getTree({
    ...repoInfo,
    tree_sha: branch.data.commit.sha, // headCommit.data.tree.sha,
    recursive: 1
  });

  glob.sync("./report/**/*.*").forEach(f => {
    console.log(f);
  });

  // tree.data.tree.pop();
  // tree.data.tree.push({
  //   path: "image222",
  //   mode: "100644",
  //   type: "blob",
  //   sha: blob.data.sha
  // });

  /*
  const newTree = await octokit.git.createTree({
    ...repoInfo,
    tree: [
      ...tree.data.tree,
      {
        path: "image.png",
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
    parents: [branch.data.commit.sha]
  });

  await octokit.git.updateRef({
    ...repoInfo,
    ref: `heads/${ref}`,
    sha: newCommit.data.sha
  });
*/
  console.log("done");
};

// if (typeof event.number !== "undefined" && event.pull_request) {
run();
//}

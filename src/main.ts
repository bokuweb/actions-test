import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { execSync } from "child_process";
import * as path from "path";
import glob from "glob";
import mkdir from "make-dir";
import cpx from "cpx";
import axios from "axios";

const compare = require("reg-cli");

const token = core.getInput("secret");

const octokit = new github.GitHub(token);

const { repo } = github.context;

const BRANCH_NAME = "gh-pages";

let event;
try {
  if (process.env.GITHUB_EVENT_PATH) {
    event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  }
} catch (e) {}

console.log(event);

const targetHash = execSync(
  `git merge-base -a origin/${event.pull_request.base.ref} origin/${event.pull_request.head.ref}`,
  { encoding: "utf8" }
).slice(0, 7);
console.log(targetHash);

if (!event) {
  throw new Error("Failed to get github event.json..");
}

const run = async () => {
  const heads = await octokit.git.listRefs(repo);
  const head = heads.data[0];
  const headCommit = await octokit.git.getCommit({
    ...repo,
    commit_sha: head.object.sha
  });
  const branches = await octokit.repos.listBranches(repo);
  const found = branches.data.find(b => b.name === BRANCH_NAME);

  if (!found) {
    await octokit.git.createRef({
      ...repo,
      ref: `refs/heads/${BRANCH_NAME}`,
      sha: headCommit.data.sha
    });
  }

  const contents = await octokit.repos
    .getContents({
      ...repo,
      path: "",
      ref: BRANCH_NAME
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
    (contents.data || [])
      .filter(file => {
        console.log(file.path);
        return (
          !!file.download_url &&
          [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif"].includes(
            path.extname(file.download_url)
          ) &&
          file.path.includes(targetHash)
        );
      })
      .map(file => {
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

  console.log("head", head);

  //
  // Get branch if not exist create one.
  let branch = await octokit.repos
    .getBranch({ ...repo, branch: BRANCH_NAME })
    .catch(e => {
      throw new Error("Failed to fetch branch.");
    });

  console.log("branch", branch);

  const ref = branch.data.name;
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

  emitter.on("compare", async (compareItem: { type: string; path: string }) => {
    console.log(compareItem);
  });

  // const image = fs.readFileSync(path.join("./expected", contents.data[1].path));
  // const content = Buffer.from(image).toString("base64");

  // console.log(content);

  // const blob = await octokit.git.createBlob({
  //   ...repo,
  //   content,
  //   encoding: "base64"
  // });

  let tree = await octokit.git.getTree({
    ...repo,
    tree_sha: branch.data.commit.sha, // headCommit.data.tree.sha,
    recursive: 1
  });

  const timestamp = new Date().getTime();

  await Promise.all(
    glob.sync("./report/**/*.*").map(async p => {
      console.log(p);
      const file = fs.readFileSync(p);
      const content = Buffer.from(file).toString("base64");
      const blob = await octokit.git.createBlob({
        ...repo,
        content,
        encoding: "base64"
      });
      tree.data.tree.push({
        path: path
          .join(`reg${event.after.slice(0, 7)}`, `${timestamp}`, p)
          .replace(/^\.\//, ""),
        mode: "100644",
        type: "blob",
        sha: blob.data.sha
      });
    })
  );

  const newTree = await octokit.git.createTree({
    ...repo,
    tree: tree.data.tree
  });

  const newCommit = await octokit.git.createCommit({
    ...repo,
    tree: newTree.data.sha,
    message: "Commit By reg!",
    parents: [branch.data.commit.sha]
  });

  console.log("ref", ref);

  await octokit.git.updateRef({
    ...repo,
    ref: `heads/${ref}`,
    sha: newCommit.data.sha
  });
  console.log("done");
};

if (typeof event.number !== "undefined" && event.pull_request) {
  run();
}

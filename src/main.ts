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

if (!event) {
  throw new Error("Failed to get github event.json..");
}

const run = async () => {
  const timestamp = `${Math.floor(new Date().getTime() / 1000)}`;
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

  const branch = await octokit.repos
    .getBranch({ ...repo, branch: BRANCH_NAME })
    .catch(e => {
      throw new Error("Failed to fetch branch.");
    });

  const ref = branch.data.name;
  const tree = await octokit.git.getTree({
    ...repo,
    tree_sha: branch.data.commit.sha,
    recursive: 1
  });

  const currentHash =
    event.after ||
    (
      event.pull_request &&
      event.pull_request.head &&
      event.pull_request.head.sha
    ).slice(0, 7);

  const publish = async () => {
    await Promise.all(
      glob.sync("./report/**/*.*").map(async p => {
        console.log("publish path", p);
        const file = fs.readFileSync(p);
        const content = Buffer.from(file).toString("base64");
        const blob = await octokit.git.createBlob({
          ...repo,
          content,
          encoding: "base64"
        });

        tree.data.tree.push({
          path: path
            .join(`reg${currentHash}`, p.replace("report/", ""))
            .replace(/^\.\//, ""),
          mode: "100644",
          type: "blob",
          sha: blob.data.sha
        });
      })
    );

    const stamp = await octokit.git.createBlob({
      ...repo,
      content: timestamp
    });

    tree.data.tree.push({
      path: path
        .join(`reg${currentHash}`, `${timestamp}.txt`)
        .replace(/^\.\//, ""),
      mode: "100644",
      sha: stamp.data.sha
    });

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

    await octokit.git.updateRef({
      ...repo,
      ref: `heads/${ref}`,
      sha: newCommit.data.sha,
      force: true
    });
  };

  cpx.copySync(`./actual/**/*.{png,jpg,jpeg,tiff,bmp,gif}`, "./report/actual");

  // Not PR
  if (typeof event.number === "undefined") {
    await publish();
    return;
  }

  const targetHash = execSync(
    `git merge-base -a origin/${event.pull_request.base.ref} origin/${event.pull_request.head.ref}`,
    { encoding: "utf8" }
  ).slice(0, 7);

  console.log(
    "+++++++++++++++++++++++ targetHash ++++++++++++++++++++++++++++++++++++++"
  );
  console.log(targetHash);
  console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

  const contents = await octokit.repos
    .getContents({
      ...repo,
      path: `reg${targetHash}/actual`,
      ref: BRANCH_NAME
    })
    .catch(() => {
      return { data: [] };
    });

  await Promise.all(
    (contents.data || [])
      .filter(file => {
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
          responseType: "arraybuffer"
        }).then(response => {
          const p = path.join("./report/expected", path.basename(file.path));
          mkdir.sync(path.dirname(p));
          fs.writeFileSync(p, Buffer.from(response.data, "binary"));
        });
      })
  );

  // console.log("download complete");
  // console.log("branch", branch);
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

  emitter.on("complete", async result => {
    console.log("result", result);
    await publish();

    await octokit.issues.createComment({
      ...repo,
      number: event.number,
      body: "hello"
      // commit_id: currentHash,
      // path,
      // position
    });

    console.log("done");
  });
};

run();

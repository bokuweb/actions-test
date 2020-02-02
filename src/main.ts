import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import cpx from "cpx";
import makeDir from "make-dir";

const compare = require("reg-cli");
const NodeZip = require("node-zip");

const token = core.getInput("secret");

const octokit = new github.GitHub(token);

const { repo } = github.context;

// const BRANCH_NAME = "gh-pages";

let event;
try {
  if (process.env.GITHUB_EVENT_PATH) {
    event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  }
} catch (e) {}

if (!event) {
  throw new Error("Failed to get github event.json..");
}

console.log(event);

const [owner, reponame] = event.repository.full_name.split("/");

const actual = core.getInput("actual-directory-path");

console.log(owner, reponame);
console.log(actual, "aaa");

console.log(process.env.INPUT_ACTUAL_DIRECTORY_PATH, "===-=-");

// TODO: fetch all run
const run = async () => {
  const runs = await octokit.actions.listRepoWorkflowRuns({
    ...repo,
    per_page: 100
  });
  // console.log("==== runs ==== ", runs);
  // console.log(runs.data.workflow_runs);

  // const timestamp = `${Math.floor(new Date().getTime() / 1000)}`;
  //   const heads = await octokit.git.listRefs(repo);
  //   const head = heads.data[0];
  //   const headCommit = await octokit.git.getCommit({
  //     ...repo,
  //     commit_sha: head.object.sha
  //   });

  // console.log("current hash = ", head.object.sha);

  // const branches = await octokit.repos.listBranches(repo);
  // const found = branches.data.find(b => b.name === BRANCH_NAME);

  // if (!found) {
  //   await octokit.git.createRef({
  //     ...repo,
  //     ref: `refs/heads/${BRANCH_NAME}`,
  //     sha: headCommit.data.sha
  //   });
  // }

  //   const branch = await octokit.repos
  //     .getBranch({ ...repo, branch: BRANCH_NAME })
  //     .catch(e => {
  //       throw new Error("Failed to fetch branch.");
  //     });

  // const ref = branch.data.name;
  // const tree = await octokit.git.getTree({
  //   ...repo,
  //   tree_sha: branch.data.commit.sha,
  //   recursive: "1"
  // });

  const currentHash = (
    event.after ||
    (event.pull_request &&
      event.pull_request.head &&
      event.pull_request.head.sha)
  ).slice(0, 7);

  console.log("current hash = ", currentHash);

  const currentRun = runs.data.workflow_runs.find(run =>
    run.head_sha.startsWith(currentHash)
  );

  console.log("current run = ", currentRun);

  //  const publish = async () => {
  //    await Promise.all(
  //      glob.sync("./report/**/*.*").map(async p => {
  //        console.log("publish path", p);
  //        const file = fs.readFileSync(p);
  //        const content = Buffer.from(file).toString("base64");
  //        const blob = await octokit.git.createBlob({
  //          ...repo,
  //          content,
  //          encoding: "base64"
  //        });
  //
  //        tree.data.tree.push({
  //          path: path
  //            .join(`${currentHash}`, p.replace("report/", ""))
  //            .replace(/^\.\//, ""),
  //          mode: "100644",
  //          type: "blob",
  //          sha: blob.data.sha
  //        });
  //      })
  //    );
  //
  //    const stamp = await octokit.git.createBlob({
  //      ...repo,
  //      content: timestamp
  //    });
  //
  //    tree.data.tree.push({
  //      path: path
  //        .join(`${currentHash}`, `${timestamp}.txt`)
  //        .replace(/^\.\//, ""),
  //      mode: "100644",
  //      sha: stamp.data.sha
  //    });
  //
  //    const newTree = await octokit.git.createTree({
  //      ...repo,
  //      tree: tree.data.tree
  //    });
  //
  //    const newCommit = await octokit.git.createCommit({
  //      ...repo,
  //      tree: newTree.data.sha,
  //      message: "Commit By reg!",
  //      parents: [branch.data.commit.sha]
  //    });
  //
  //    await octokit.git.updateRef({
  //      ...repo,
  //      ref: `heads/${ref}`,
  //      sha: newCommit.data.sha,
  //      force: true
  //    });
  //  };
  //

  console.log(path.join(actual, `**/*.{png,jpg,jpeg,tiff,bmp,gif}`));

  cpx.copySync(
    path.join(actual, `**/*.{png,jpg,jpeg,tiff,bmp,gif}`),
    "./__reg__/actual"
  );

  // Not PR
  if (typeof event.number === "undefined") {
    //    await publish();
    return;
  }

  const targetHash = execSync(
    `git merge-base -a origin/${event.pull_request.base.ref} origin/${event.pull_request.head.ref}`,
    { encoding: "utf8" }
  ).slice(0, 7);

  console.log(
    "+++++++++++++++++++++++ targetHash ++++++++++++++++++++++++++++++++++++++++"
  );
  console.log(targetHash);
  console.log(
    "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
  );

  const targetRun = runs.data.workflow_runs.find(run =>
    run.head_sha.startsWith(targetHash)
  );

  console.log("targetRun", targetRun);
  if (!targetRun) {
    console.error("Failed to find target run");
    return;
  }

  // TODO: fetch all artifacts
  const res = await octokit.actions.listWorkflowRunArtifacts({
    ...repo,
    run_id: targetRun.id,
    per_page: 100
  });

  // console.log("artifacts", artifacts.data.);
  // console.log("artifacts", (artifacts.data as any).artifacts);

  const { artifacts } = res.data as any;
  const latest = artifacts[artifacts.length - 1];

  console.log("latest", latest);

  const zip = await octokit.actions.downloadArtifact({
    ...repo,
    artifact_id: latest.id,
    archive_format: "zip"
  });

  console.log(zip);

  const files = new NodeZip(zip.data, {
    base64: false,
    checkCRC32: true
  });

  // console.log(files);
  console.log("aaaaaaaaaaaaaaaa!!!!!!!!!!!!!a");
  Object.keys(files.files)
    .map(key => files.files[key])
    .filter(file => !file.dir)
    .forEach(async file => {
      // console.log(file);
      const f = path.join("__reg__", "expected", path.basename(file.name));
      console.log(f);
      await makeDir(path.dirname(f));
      console.log("bbbbb");
      console.log(str2ab(file._data));
      fs.writeFileSync(f, str2ab(file._data));
    });
  console.log("=========");
  /*  const contents = await octokit.repos
    .getContents({
down      ...repo,
      path: `${targetHash}/actual`,
      ref: BRANCH_NAME
    })
    .catch(() => {
      return { data: [] };
    });*/

  /*
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
  );*/

  // console.log("download complete");
  // console.log("branch", branch);

  const emitter = compare({
    actualDir: "./__reg__/actual",
    expectedDir: "./__reg__/expected",
    diffDir: "./__reg__/diff",
    json: "./__reg__/reg.json",
    report: "./__reg__/index.html",
    update: false,
    ignoreChange: true,
    urlPrefix: ""
  });

  emitter.on("compare", async (compareItem: { type: string; path: string }) => {
    console.log(compareItem);
  });

  emitter.on("complete", async result => {
    console.log("result", result);
    //    await publish();

    const [owner, reponame] = event.repository.full_name.split("/");
    const url = `https://${owner}.github.io/${reponame}/reg${currentHash}/`;

    await octokit.issues.createComment({
      ...repo,
      issue_number: event.number,
      body: url
    });

    console.log("done");
  });
};

run();

function str2ab(str) {
  console.log(str.length);
  var array = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    array[i] = str.charCodeAt(i);
  }
  return array;
}

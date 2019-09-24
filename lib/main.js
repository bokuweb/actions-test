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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const glob_1 = __importDefault(require("glob"));
const make_dir_1 = __importDefault(require("make-dir"));
const cpx_1 = __importDefault(require("cpx"));
const axios_1 = __importDefault(require("axios"));
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
}
catch (e) { }
console.log(event);
if (!event) {
    throw new Error("Failed to get github event.json..");
}
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const heads = yield octokit.git.listRefs(repo);
    const head = heads.data[0];
    const headCommit = yield octokit.git.getCommit(Object.assign(Object.assign({}, repo), { commit_sha: head.object.sha }));
    const branches = yield octokit.repos.listBranches(repo);
    const found = branches.data.find(b => b.name === BRANCH_NAME);
    if (!found) {
        yield octokit.git.createRef(Object.assign(Object.assign({}, repo), { ref: `refs/heads/${BRANCH_NAME}`, sha: headCommit.data.sha }));
    }
    const branch = yield octokit.repos
        .getBranch(Object.assign(Object.assign({}, repo), { branch: BRANCH_NAME }))
        .catch(e => {
        throw new Error("Failed to fetch branch.");
    });
    const ref = branch.data.name;
    let tree = yield octokit.git.getTree(Object.assign(Object.assign({}, repo), { tree_sha: branch.data.commit.sha, recursive: 1 }));
    const publish = () => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all(glob_1.default.sync("./report/**/*.*").map((p) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(p);
            const file = fs.readFileSync(p);
            const content = Buffer.from(file).toString("base64");
            const blob = yield octokit.git.createBlob(Object.assign(Object.assign({}, repo), { content, encoding: "base64" }));
            const sha = event.after ||
                (event.pull_request &&
                    event.pull_request.head &&
                    event.pull_request.head.sha);
            tree.data.tree.push({
                path: path
                    .join(`reg${sha.slice(0, 7)}`, p.replace("report/", ""))
                    .replace(/^\.\//, ""),
                mode: "100644",
                type: "blob",
                sha: blob.data.sha
            });
        })));
        const timestamp = `${~~(new Date().getTime() * 1000)}`;
        const stamp = yield octokit.git.createBlob(Object.assign(Object.assign({}, repo), { content: `${~~(new Date().getTime() / 1000)}` }));
        tree.data.tree.push({
            path: path
                .join(`reg${event.after.slice(0, 7)}`, `${timestamp}.txt`)
                .replace(/^\.\//, ""),
            mode: "100644",
            sha: stamp.data.sha
        });
        const newTree = yield octokit.git.createTree(Object.assign(Object.assign({}, repo), { tree: tree.data.tree }));
        const newCommit = yield octokit.git.createCommit(Object.assign(Object.assign({}, repo), { tree: newTree.data.sha, message: "Commit By reg!", parents: [branch.data.commit.sha] }));
        yield octokit.git.updateRef(Object.assign(Object.assign({}, repo), { ref: `heads/${ref}`, sha: newCommit.data.sha }));
    });
    cpx_1.default.copySync(`./actual/**/*.{png,jpg,jpeg,tiff,bmp,gif}`, "./report/actual");
    // Not PR
    if (typeof event.number === "undefined") {
        yield publish();
        return;
    }
    const contents = yield octokit.repos
        .getContents(Object.assign(Object.assign({}, repo), { path: "", ref: BRANCH_NAME }))
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
    const targetHash = child_process_1.execSync(`git merge-base -a origin/${event.pull_request.base.ref} origin/${event.pull_request.head.ref}`, { encoding: "utf8" }).slice(0, 7);
    console.log(targetHash);
    yield Promise.all((contents.data || [])
        .filter(file => {
        console.log(file.path);
        return (!!file.download_url &&
            [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif"].includes(path.extname(file.download_url)) &&
            file.path.includes(targetHash));
    })
        .map(file => {
        return axios_1.default({
            method: "get",
            url: file.download_url,
            // responseType: "stream"
            responseType: "arraybuffer"
        }).then(response => {
            const p = path.join("./report/expected", file.path);
            make_dir_1.default.sync(path.dirname(p));
            // let blob = new Blob([response.data], { type: "image/png" });
            fs.writeFileSync(p, Buffer.from(response.data, "binary"));
            //response.data.pipe(fs.createWriteStream(p));
        });
    }));
    //   console.log(
    //     fs.readFileSync(path.join("./expected", contents.data[1].path), "utf-8")
    //   );
    console.log("download complete");
    console.log("head", head);
    //
    // Get branch if not exist create one.
    console.log("branch", branch);
    console.log(ref);
    // cpx.copySync(`./actual/**/*.{png,jpg,jpeg,tiff,bmp,gif}`, "./report/actual");
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
    emitter.on("compare", (compareItem) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(compareItem);
    }));
    // const image = fs.readFileSync(path.join("./expected", contents.data[1].path));
    // const content = Buffer.from(image).toString("base64");
    // const timestamp = ~~(new Date().getTime() / 10000);
    yield publish();
    // const stamp = await octokit.git.createBlob({
    //   ...repo,
    //   content: `${~~(new Date().getTime() / 1000)}`
    // });
    // tree.data.tree.push({
    //   path: path
    //     .join(`reg${event.after.slice(0, 7)}`, `${timestamp}.txt`)
    //     .replace(/^\.\//, ""),
    //   mode: "100644",
    //   sha: stamp.data.sha
    // });
    //   const newTree = await octokit.git.createTree({
    //     ...repo,
    //     tree: tree.data.tree
    //   });
    //
    //   const newCommit = await octokit.git.createCommit({
    //     ...repo,
    //     tree: newTree.data.sha,
    //     message: "Commit By reg!",
    //     parents: [branch.data.commit.sha]
    //   });
    //
    //   console.log("ref", ref);
    //
    //   await octokit.git.updateRef({
    //     ...repo,
    //     ref: `heads/${ref}`,
    //     sha: newCommit.data.sha
    //   });
    console.log("done");
});
// if (typeof event.number !== "undefined" && event.pull_request) {
run();
// }

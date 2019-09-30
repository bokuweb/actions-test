const request = require("request");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mkdir = require("make-dir");
const url =
  "https://github.com/bokuweb/test/commit/f9675e0e43ef6ffea5835a7d0b8d9ec7bbe28f89/checks";

axios(url).then(res => {
  try {
    const $ = cheerio.load(res.data);
    $("a").each((i, elem) => {
      if ($(elem).text() === "my-artifact") {
        const a = encodeURIComponent($(elem)[0].attribs.href);
        const href = $(elem)[0].attribs.href;
        // axios({
        //   method: "get",
        //   url: `https://github.com${href}`,
        //   responseType: "arraybuffer"
        // }).then(response => {
        //   fs.writeFileSync(
        //     "artifacts.zip",
        //     Buffer.from(response.data, "binary")
        //   );
        // });
      }
    });
  } catch (e) {
    console.error(e);
  }
});

const request = require("request");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mkdir = require("make-dir");
const url =
  "https://github.com/bokuweb/test/commit/f9675e0e43ef6ffea5835a7d0b8d9ec7bbe28f89/checks";
const titles_arr = [];

request(url, (e, response, body) => {
  if (e) {
    console.error(e);
  }
  try {
    const $ = cheerio.load(body); //bodyの読み込み
    $("a").each((i, elem) => {
      //'m_unit'クラス内のh3タグ内要素に対して処理実行
      if ($(elem).text() === "my-artifact") {
        console.log($(elem)[0].attribs.href);
        const href = $(elem)[0].attribs.href;
        axios({
          method: "get",
          url: `https://github.com${href}`,
          responseType: "arraybuffer"
        }).then(response => {
          fs.writeFileSync(
            "artifacts.zip",
            Buffer.from(response.data, "binary")
          );
        });
      }
    });
  } catch (e) {
    console.error(e);
  }
});

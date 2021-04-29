#!/usr/bin/env node

const path = require("path");
const parser = require("yargs-parser");

const { getLang } = require("../index.js");

const { _: commands, ...argv } = parser(process.argv.slice(2), {
  alias: {
    dir: "d",
    lang: "l",
    file: "f",
    host: "h",
    ignoredir: "i", // 需要忽略的文件夹或者文件名称，用","链接
    fix: "f"
  },
});

if (commands[0] === "collect") {
  const { dir, ignoredir } = argv;
  let { fix } = argv;
  if (fix === "false") fix = false;
  getLang(path.resolve(dir), ignoredir, "zh-CN-test.js", fix);
}

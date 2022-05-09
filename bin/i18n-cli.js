#!/usr/bin/env node

const path = require("path");
const parser = require("yargs-parser");

const getLang = require("../index.js");

const { ...argv } = parser(process.argv.slice(2), {
  alias: {
    dir: "d",
    lang: "l",
    host: "h",
    ignoredir: "i", // 需要忽略的文件夹或者文件名称，用","链接
    fix: "f",
  },
});

let { dir, ignoredir, fix } = argv;
if(dir) dir = path.resolve(dir);
if (fix === "false") fix = false;
getLang(dir, ignoredir, fix);

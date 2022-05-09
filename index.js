const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { merge } = require("lodash");
const FileHandler = require("./lib/file-handler");
const FileTraverse = require("./lib/utils/file-traverse");
const lint = require("./lib/utils/run-lint");
const { rplArrayMerge } = require('./lib/utils/common');
const getConfig = require('./lib/get-config');

const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

class I18nCollect {
  constructor(options) {
    options = rplArrayMerge({}, getConfig(), options);
    this._fileHandler = new FileHandler(options.file);
    this._collection = {};
    this._errorPath = [];
    this._statusSet = new Set();
    this._fix = options.fix;
    this._ignore = options.ignoredir || [];
    this._path = options.dir || "";
    const fileNameArr = (options.output || "").split(".");
    const lang = fileNameArr.slice(0, fileNameArr.length - 1).join(".");
    this._i18nFileTemp = Object.freeze({
      lang,
      get messages() {
        return {};
      },
    });
  }

  async _rmvStatusItem(item) {
    try {
      this._statusSet.delete(item);
      if (!this._statusSet.size) {
        await this._finish().catch((err) => {
          console.log(`write i18n file failed in ${this._path}`);
        });
        if(!this._fix) return;
        console.log("collect finished, start lint!!!");
        await lint(this._path)
          .catch((err) => {
            if (!err.killed) {
              console.log("部分文件eslint --fix失败，再次执行eslint --fix...");
              return lint(this._path);
            }
          })
          .catch((err) => {
            console.log("lint error:::\r\n", err);
          });
        console.log("i18n finished!!!");
      }
    } catch (err) {
      throw err;
    }
  }

  async _visit(filePath) {
    try {
      this._statusSet.add(filePath);
      const res = await this._fileHandler.exec(filePath);
      merge(this._collection, res);
      this._rmvStatusItem(filePath);
    } catch (err) {
      this._errorPath.push(filePath);
      this._rmvStatusItem(filePath);
      throw (`visit ${filePath} error:::`, err);
    }
  }

  async _finish() {
    const i18nDirName = path.join(this._path, "i18n");
    const i18nFilePath = path.join(
      i18nDirName,
      `${this._i18nFileTemp.lang}.js`
    );
    const hasI18nDir = await exists(i18nDirName);
    if (!hasI18nDir) {
      const isError = await mkdir(i18nDirName);
    }
    const writeObj = {
      ...this._i18nFileTemp,
      messages: this._collection,
    };
    await writeFile(
      i18nFilePath,
      `export default ${JSON.stringify(writeObj, (key, val) => val, 2)}`,
      "utf8"
    );
  }

  exec() {
    const traverseOption = {
      ignore: ["node_modules", "i18n"].concat(this._ignore),
      visit: this._visit.bind(this),
    };
    const fileTraverse = new FileTraverse(traverseOption);
    fileTraverse.traverse(this._path);
  }
}
const getLang = (dir, ignoredir, fix) => {
  let cmdConfig = {
    dir,
    ignoredir,
    fix,
  };
  cmdConfig = Object.keys(cmdConfig).reduce((o, key)=>{
    if(![undefined, null].includes(cmdConfig[key])) {
      o[key] = cmdConfig[key]
    }
    return o
  }, {})
  const collect = new I18nCollect(cmdConfig);
  collect.exec();
};
// getLang("./examples");
module.exports = getLang;

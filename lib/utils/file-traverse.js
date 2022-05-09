const fs = require("fs");
const path = require("path");
const { typeOf, isDefArr, classifyMatchArr } = require("../utils/common");

const nulFunc = () => null;

class FileTraverse {
  constructor(options) {
    this._ignoreInfo = classifyMatchArr(options.ignore || []);
    this._visit = options.visit || nulFunc;
  }

  _getChildren(pathName) {
    const stat = fs.statSync(pathName);
    if (!stat.isDirectory()) return [];
    return fs
      .readdirSync(pathName)
      .map((cPathName) => path.join(pathName, cPathName));
  }

  _toIgnore(pathName) {
    const { str, reg } = this._ignoreInfo;
    const checkStr = str.some((item) => item && pathName.endsWith(item));
    const checkReg = reg.some((item) => item.test(pathName));
    return checkStr || checkReg;
  }

  traverse(root) {
    let checkArr = [root];
    let checkItem = null;
    while (checkArr.length) {
      checkItem = checkArr.shift();
      if (this._toIgnore(checkItem)) continue;
      this._visit(checkItem);
      const children = this._getChildren(checkItem);
      if (isDefArr(children)) {
        checkArr = checkArr.concat(children);
      }
    }
  }
}

module.exports = FileTraverse;

const { EventEmitter } = require("events");
const t = require("@babel/types");
const { parse } = require("@babel/parser");
const { handleStrQuote, parseCnStr, parseTemplateStr } = require("../utils/rules");


const checkSvgStr = (str) => {
  const checkSvgDom = /<[a-zA-Z]+(\s\S+?\=(['"]).+\2)*\s*>/;
  return checkSvgDom.test(str);
};

class ScriptTranslate {
  // opt: {
  //   addImport: {
  //     from: 'megvii-i18n',
  //     data: 'i18n',
  //   },
  //   prefix: 'i18n.t'
  // }
  constructor(opt) {
    this._bus = new EventEmitter();
    this._addImport = opt.addImport;
    this._prefix = opt.prefix || "";
    this._sparePrefix = opt.sparePrefix||''
    this._programPath = null;
    this._addImportI18nFunc = this._addImportI18n.bind(this);
    this._checkProgramImportFunc = this._checkProgramImport.bind(this);
    this._init();
  }

  _init() {
    if (this._addImport) {
      this._bus.once("init-import", this._addImportI18nFunc);
      this._bus.on("check-program", this._checkProgramImportFunc);
    }
  }

  _addImportI18n(checkImport) {
    if (checkImport) {
      this._addExistImport(checkImport);
      return;
    }
    const { from, data } = this._addImport;
    const specifiers = Array.isArray(data)
      ? data.map((item) =>
          t.ImportSpecifier(t.Identifier(item), t.Identifier(item))
        )
      : [t.ImportDefaultSpecifier(t.Identifier(data))];
    const addItem = t.importDeclaration(specifiers, t.stringLiteral(from));
    this._programPath.get("body")[0].insertBefore(addItem);
  }

  _addExistImport(checkImport) {
    const { from, data } = this._addImport;
    const { specifiers } = checkImport.node;
    if (Array.isArray(data)) {
      const addItems = data.filter((name) => {
        const hasItem = specifiers.find((item) => {
          const { type, imported } = item;
          return type === "ImportSpecifier" && imported.name === name;
        });
        return !hasItem;
      });
      addItems.forEach((item) => {
        const insertItem = t.ImportSpecifier(t.Identifier(item), t.Identifier(item));
        checkImport.get('specifiers.0').insertAfter(insertItem);
      });
    } else {
      const addItem = specifiers.find((item) => {
        const { type, imported } = item;
        return type === "ImportDefaultSpecifier" && imported.name === data;
      });
      if (!addItem) {
        const insertItem = t.ImportDefaultSpecifier(t.Identifier(data));
        checkImport.get('specifiers.0').insertBefore(insertItem);
      }
    }
  }

  _checkProgramImport(path) {
    if (!this._programPath) {
      this._programPath = path.findParent((p) => p.type === "Program");
    }
    const { from, data } = this._addImport;
    const checkImport = this._programPath
      .get("body")
      .filter((p) => p.type === "ImportDeclaration")
      .find((item) => item.node.source.value === from);
    this._bus.emit("init-import", checkImport);
  }

  _checkHasTranslated(path) {
    const parentNode = path.parent;
    if (parentNode.type === "CallExpression") {
      const parentCallee = parentNode.callee;
      const testPrefixArr = [];
      if (parentCallee.object) {
        if (parentCallee.object.type === "ThisExpression") {
          testPrefixArr.push("this");
        } else {
          testPrefixArr.push(parentCallee.object.name);
        }
      }
      if (parentCallee.property) {
        testPrefixArr.push(parentCallee.property.name);
      }
      const testPrefix = testPrefixArr.filter((item) => item).join(".");
      return testPrefix && [this._prefix, this._sparePrefix].includes(testPrefix);
    }
    return false;
  };

  _strTrans(str, path, strCollect) {
    if (checkSvgStr(str)) return str;
    if (this._checkHasTranslated(path)) {
      strCollect(`${this._prefix}('${handleStrQuote(str)}')`);
      return str;
    }
    // {[key]: value}
    if (path.parent.type === "ObjectProperty" && path.key === "key") {
      path.parent.computed = true;
    }
    let rst = null;
    if (path.type === "TemplateLiteral") {
      rst = parseTemplateStr(this._prefix)(str);
    } else {
      rst = parseCnStr(this._prefix)(str);
    }
    if (rst !== str) {
      strCollect(rst);
      return rst;
    }
    return str;
  }

  translate(value, path, strCollect) {
    this._bus.emit("check-program", path);
    return this._strTrans(value, path, strCollect);
  }
}

module.exports = ScriptTranslate;

const fs = require("fs");
const { promisify } = require("util");
const { merge } = require("lodash");
const { scriptTransform, templateTransform } = require("../transform");
const { ScriptTranslate, TemplateTranslate } = require("../translate");
const {
  getTemplate,
  scriptClassify,
  getStyleArr,
  fileCompose,
  collectFileTransWords,
} = require("./utils");

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const encoding = "utf8";

class FileHandler {
  constructor(options) {
    const {
      template: templateOpt = { prefix: "$t" },
      js: jsOpt = { prefix: "i18n.t" },
      vue: vueOpt = { prefix: "this.$t" },
    } = options;
    const tempTranslate = new TemplateTranslate(templateOpt);
    const jsTranslate = new ScriptTranslate(jsOpt);
    const vueTranslate = new ScriptTranslate(vueOpt);

    this._vueTempTransform = templateTransform(
      tempTranslate.translate.bind(tempTranslate)
    );
    this._jsTransform = scriptTransform(
      jsTranslate.translate.bind(jsTranslate)
    );
    this._vueTransform = scriptTransform(
      vueTranslate.translate.bind(vueTranslate)
    );

    this._collectTemp = collectFileTransWords(templateOpt.prefix);
    this._collectJs = collectFileTransWords(jsOpt.prefix);
    this._collectVue = collectFileTransWords(vueOpt.prefix);
  }

  async exec(filePath) {
    let collection = {};
    if (!/\.vue$|\.js$/.test(filePath)) return collection;

    const collectTemp = this._collectTemp(filePath);
    const collectJs = this._collectJs(filePath);
    const collectVue = this._collectVue(filePath);

    const vueTempTransform = this._vueTempTransform(collectTemp);
    const jsTransform = this._jsTransform(collectJs);
    const vueTransform = this._vueTransform(collectVue);
    const source = await readFile(filePath, encoding);

    let transSource = source;
    if (filePath.endsWith(".vue")) {
      const template = getTemplate(source);
      const scriptInfo = scriptClassify(source);
      const styleArr = getStyleArr(source);
      const transScriptInfo = {
        ...scriptInfo,
        jsStr: jsTransform(scriptInfo.jsStr),
        vueObjStr: vueTransform(scriptInfo.vueObjStr),
      };
      const transTemplateInfo = await vueTempTransform(template);

      transSource = fileCompose(transTemplateInfo, transScriptInfo, styleArr);
    } else {
      transSource = jsTransform(source);
    }
    // console.log(transSource)
    writeFile(filePath, transSource, encoding);
    const rtnArgs = [collectTemp, collectJs, collectVue].map((item) =>
      item.getValue()
    );
    collection = merge({}, ...rtnArgs);
    return collection;
  }
}

module.exports = FileHandler;

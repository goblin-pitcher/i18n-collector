const { getRegStr, strLiteralRegStr } = require("../utils/common");

// 文件处理部分
const getTemplate = (source) => {
  const templateReg = /<template[\s\S]+<\/template>/;
  const temp = source.match(templateReg);
  return temp ? temp[0] : "";
};

const scriptClassify = (source) => {
  const scriptReg = /<script([\s\S]*?)>([\s\S]*?)(export\sdefault[\s\S]*)<\/script>/;
  const scriptMatch = source.match(scriptReg);
  if (!scriptMatch) return "";
  const [script, scriptAttrStr, jsStr, vueObjStr] = scriptMatch;
  return {
    scriptAttrStr,
    jsStr,
    vueObjStr,
  };
};

const getStyleArr = (source) => {
  const styleReg = /<style[\s\S]+<\/style>/g;
  const temp = source.match(styleReg);
  return temp || [];
};

const fileCompose = (template, scriptInfo, styleArr) => {
  const { scriptAttrStr, jsStr, vueObjStr } = scriptInfo;
  const scriptData = `\r\n<script${scriptAttrStr}>\r\n${jsStr}\r\n${vueObjStr}\r\n</script>\r\n`;
  const styleData = styleArr.join("\r\n");
  return template + scriptData + styleData;
};

// 抽取词条部分
const getCollectItems = (prefix) => (str) => {
  if (!str) return [];
  const prefixFuncRegStr = `${getRegStr(prefix)}\\(\\s*`;
  const transTextReg = new RegExp(
    `${prefixFuncRegStr}${strLiteralRegStr}`,
    "g"
  );
  const matchArr = str.match(transTextReg);
  if (!matchArr) return [];
  return matchArr
    .map((str) =>
      str.replace(new RegExp(`^${prefixFuncRegStr}`), "")
        .replace(new RegExp(strLiteralRegStr, 'g'), (str, (str, $1, $2) => $2))
    )
    .filter((item) => item);
};

const collectFileTransWords = (prefix) => (filePath) => {
  const collection = {};
  const getCollect = getCollectItems(prefix);
  const rtnFunc = (str) => {
    const strArr = getCollect(str);
    strArr.forEach((str) => (collection[str] = str));
  };
  rtnFunc.getValue = () => collection;
  return rtnFunc;
};

exports.getTemplate = getTemplate;
exports.scriptClassify = scriptClassify;
exports.getStyleArr = getStyleArr;
exports.fileCompose = fileCompose;
exports.collectFileTransWords = collectFileTransWords;

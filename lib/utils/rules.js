// 中文符号+中文文字
const cnText = "[\uff01\uff08-\uff1f\u3001-\u3015\u4E00-\u9FA5\uF900-\uFA2D]";

// const cnWordExp = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
const cnWordExp = new RegExp(cnText);

const cnTextExp = new RegExp(`${cnText}.*${cnText}`);

const templateStrExp = /\`[\s\S]*\$\{.+\}[\s\S]*\`/

const checkToTranslate = (value) => cnWordExp.test(value);

const getSingleCnWord = (str) => {
  const checkCnWord = new RegExp(cnWordExp, 'g');
  const res = str.match(checkCnWord);
  return res && res.length === 1 ? res[0] : null;
};

const getCnText = (str) => {
  const res = str.match(cnTextExp);
  if (!res) return null;
  return res[0];
};

const getCnStr = (str) => {
  if(typeof str !== 'string') return null
  return getSingleCnWord(str) || getCnText(str)
}

const getFullExp = (prefixFunc, matchStr, oriStr) => {
  const exp = `${prefixFunc}('${matchStr}')`;   
  if (matchStr === oriStr) {
    return exp;
  } else {
    const [prefix, suffix] = oriStr.split(matchStr);
    return `\`${prefix}\$\{${exp}\}${suffix}\``;
  }
};

/* =========================================主要解析方式======================================== */
const handleStrQuote = (str) => str.replace(/'|"/g, str=>`\\${str}`)

// 解析含中文文本
const parseCnStr = (prefix) => (str) => {
  const cnStr = getCnStr(str);
  if (!cnStr) return null;
  const transCnStr = getFullExp(prefix, handleStrQuote(cnStr), str);
  // cb(cnStr);
  return transCnStr;
};
// 解析含中文模板字符串
const parseTemplateStr = (prefix) => (str) => {
  if (!(templateStrExp.test(str) && cnTextExp.test(str))) return null;
  const templateReg = /\$\{(.+?)\}/g;
  const strCollect = [];
  const rplStr = str
    .replace(templateReg, (item, $1) => {
      strCollect.push($1);
      const valueName = `value${(strCollect.length - 1) || ''}`
      return `{${valueName}}`;
    })
    .replace(/\`/g, "");
  const objStr = strCollect.map((name, index)=> `value${index||''}: ${name}`).join(", ")
  // 模板字符串统一转换为$t(`中文{value}中文{value1}`, {value: count, value: len})格式
  // ，避免变量命名不同导致同种模板被当成两种类型的模板
  // cb(rplStr);
  return `${prefix}('${handleStrQuote(rplStr)}', { ${objStr} })`;
};

exports.cnTextExp = cnTextExp;
exports.templateStrExp = templateStrExp;
exports.checkToTranslate = checkToTranslate;
exports.getCnStr = getCnStr;
exports.handleStrQuote = handleStrQuote;
exports.getFullExp = getFullExp;
exports.parseCnStr = parseCnStr;
exports.parseTemplateStr = parseTemplateStr;

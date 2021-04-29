const {
  cnTextExp,
  checkToTranslate,
  getCnStr,
  parseCnStr,
  parseTemplateStr,
} = require("../utils/rules");
const {
  combineArr,
  recombineContent,
  getRegStr,
  strLiteralRegStr,
} = require("../utils/common");

const mustacheRegStr = "\\{\\{[\\s\\S]+?\\}\\}";

const mustacheReg = new RegExp(mustacheRegStr);
const pureMustacheReg = new RegExp(`^${mustacheRegStr}$`);

class TemplateTranslate {
  constructor(options) {
    this._prefix = options.prefix || "t";
    this._init();
  }
  _translateContentProxy = (str, strCollect) => {
    const transVal = this._translateContent(str);
    strCollect(transVal);
    return transVal;
  };

  _translateAttr = (key, value, strCollect) => {
    if (!checkToTranslate(value)) return { [key]: value };
    let transVal = value;
    if (/^(:|v-)/.test(key)) {
      transVal = this._transExpressionCnStr(value);
      // :disabled="true" => disabled
      if (transVal === true) {
        key = key.replace(/^:/, "");
      }
    } else {
      key = `:${key}`;
      transVal = this._domParseCnStr(value);
    }
    strCollect(transVal);
    return {
      [key]: transVal,
    };
  };

  _init() {
    this._domParseCnStr = parseCnStr(this._prefix); // 转换中文字符串
    this._domParseTemplateStr = parseTemplateStr(this._prefix); // 转换模板字符串
  }

  _translateContent = (str) => {
    if (!checkToTranslate(str)) return str;
    if (mustacheReg.test(str)) {
      // 纯content模板：{{ value+"中文" }}
      if (pureMustacheReg.test(str)) {
        return this._transExpressionCnStr(str);
      } else {
        const recombineStr = recombineContent(mustacheReg);
        // xx中文{{a}}中文{{b}}xx => ['xx中文', '{{a}}', '中文', {{b}}, 'xx']
        const strArr = recombineStr([str], false);
        // 需要把上述数组中['xx中文', '{{a}}', '中文']合并转换成{{$t("xx中文{value}中文", {value: a})}}
        const checkFunc = (str) =>
          !pureMustacheReg.test(str) && checkToTranslate(str);
        const startIndex = strArr.findIndex(checkFunc);
        const endIndex =
          strArr.findIndex(
            (str, index) => index > startIndex && checkFunc(str)
          ) + 1;
        if (startIndex >= 0 && endIndex > 0) {
          const prefixArr = strArr
            .slice(0, startIndex)
            .map(this._translateContent);
          const mainStr = this._transMustacheMixStr(
            strArr.slice(startIndex, endIndex)
          );
          const suffixArr = strArr.slice(endIndex).map(this._translateContent);
          const transArr = prefixArr.concat(mainStr).concat(suffixArr);
          return transArr.join("");
        }
        return strArr.map(this._translateContent).join("");
      }
    } else {
      if (str.split(/\n/).length>1) {
        const  textArr = str.split(/\n/).map(this._translateContent);
        return textArr.join("")
      }
      // 思路如下：
      // "  asadasj中文 as中文aaa"
      // => ["  asadasj", "中文 as中文", "aaa"]
      // => ["  asadasj", {{$t("中文 as中文")}}, "aaa"]
      // => "  asadasj{{$t("中文 as中文")}}aaa"
      const cnStr = getCnStr(str);
      const transCnStr = this._domParseCnStr(cnStr);
      if (!transCnStr) return str;
      const i18nReg = new RegExp(`${getRegStr(this._prefix)}\\(.+?\\)`, "g");
      const domTransCnStr = transCnStr.replace(
        i18nReg,
        (i18nStr) => `{{${i18nStr}}}`
      );
      const fixArr = str.split(cnStr);
      return combineArr(fixArr, [domTransCnStr]).join("");
    }
  };

  // 判断字符串前面有没有 $t( ，有则代表已被转换过
  _checkHasTranslated(str, index) {
    const reg = new RegExp(`(${getRegStr(this._prefix)}\\(\\s*)$`);
    return reg.test(str.substr(0, index));
  }

  // 表达式:: a+"中文"+`中文${b}` => a+$t("中文")+$t("中文{value}", {value: b})
  _transExpressionCnStr(str) {
    const strLiteralReg = new RegExp(strLiteralRegStr, "g");
    return str.replace(
      strLiteralReg,
      (strLiteral, quote, strContent, index) => {
        // 用正则的(?<! pattern)语法会干扰引号的正常匹配，因此用_checkHasTranslated验证是否已被翻译
        if (this._checkHasTranslated(str, index)) return strLiteral;
        if (quote === "`") {
          return this._domParseTemplateStr(strLiteral) || strLiteral;
        } else {
          return this._domParseCnStr(strContent) || strLiteral;
        }
      }
    );
  }

  // 思路如下：
  // ['xx中文', '{{a+"中文"}}', '中文xx']
  // => ['xx中文', '${a+$t("中文")}', '中文xx']
  // => xx`中文${a+$t("中文")}中文`xx
  // => xx{{$t("中文{value}中文", {value: a+$t("中文")})}}
  _transMustacheMixStr(strArr) {
    const templateStrArr = strArr.map((str) => {
      if (pureMustacheReg.test(str)) {
        const transMustacheStr = this._transExpressionCnStr(str);
        return transMustacheStr.replace(/^\{\{/, "${").replace(/\}\}$/, "}");
      }
      return str;
    });
    return templateStrArr.join("").replace(cnTextExp, (item) => {
      const templateStr = `\`${item}\``;
      const transTemplateStr = this._domParseTemplateStr(templateStr);
      return `{{${transTemplateStr}}}`;
    });
  }

  translate(isContent) {
    return (...args) => {
      if (isContent) {
        return this._translateContentProxy(...args);
      }
      return this._translateAttr(...args);
    };
  }
}

module.exports = TemplateTranslate;

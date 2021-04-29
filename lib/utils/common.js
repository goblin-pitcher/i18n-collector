const typeOf = (val) =>
  Object.prototype.toString
    .call(val)
    .match(/\[.+?\s(.+?)\]/)[1]
    .replace(/^\w/, (item) => item.toLowerCase());

const isDefArr = (item) => Array.isArray(item) && item.length;

const sleep = (time = 0) => new Promise((res) => { setTimeout(() => { res(); }, time); });

const classifyMatchArr = (arr) => {
  const classifyObj = { str: [], reg: [] };
  arr.forEach((item) => {
    if (typeOf(item) === "regExp") {
      classifyObj.reg.unshift(item);
    }
    if (typeOf(item) === "string") {
      classifyObj.str.unshift(item);
    }
  });
  return classifyObj;
};
// 普通字符串若需要用new RegExp生成正则，必须处理其中的特殊字符
// 该方法主要处理变量，考虑到变量命名不会采用太多特殊字符，因此不进行过多判断
const getRegStr = (str) => str.replace(/[\^$.?]/g, (item) => `\\${item}`);

const strLiteralRegStr = "([\'\"])(.+?)\(?<!\\\\)\\1";

const combineArr = (mainArr, joinArr) => {
  if (!Array.isArray(joinArr)) joinArr = [];
  return mainArr.reduce((arr, item, index) => {
    arr.push(item);
    if (index <= joinArr.length - 1) {
      arr.push(joinArr[index]);
    }
    return arr;
  }, []);
};
// 注意，正则中不能有捕获项，不然会出错
const recombineContent = (matchReg) => (content, filterDefItem = true) => {
  if (!Array.isArray(content)) content = [];
  const matchRegAll = new RegExp(matchReg, "g");
  const transContent = content.reduce((arr, item) => {
    if (typeof item === "string") {
      const splitArr = item.split(matchReg);
      const matchArr = item.match(matchRegAll);
      arr = arr.concat(combineArr(splitArr, matchArr));
    } else {
      arr.push(item);
    }
    return arr;
  }, []);
  return filterDefItem ? transContent.filter((item) => item) : transContent;
};

exports.typeOf = typeOf;
exports.isDefArr = isDefArr;
exports.sleep = sleep;
exports.classifyMatchArr = classifyMatchArr;
exports.getRegStr = getRegStr;
exports.strLiteralRegStr = strLiteralRegStr;
exports.combineArr = combineArr;
exports.recombineContent = recombineContent;

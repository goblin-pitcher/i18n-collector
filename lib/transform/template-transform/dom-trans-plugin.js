const { checkToTranslate } = require("../../utils/rules");
const { recombineContent } = require("../../utils/common");

const commentReg = /^<!--[\s\S]+?-->$/
const checkIsComment = (str) => commentReg.test(str)
const nodeContentHandler = (strTrans, node, strCollect) => {
  if (!Array.isArray(node.content)) return;
  const recombineByComment = recombineContent(commentReg);
  const contentArr = recombineByComment(node.content).map((str) => {
    if(checkIsComment(str)) return str;
    if (!checkToTranslate(str)) return str;
    const transData = strTrans(str, strCollect);
    return transData;
  });
  node.content = contentArr;
};

const nodeAttrsHandler = (strTrans, node, strCollect) => {
  if (!node.attrs) return;
  const attrsObj = Object.keys(node.attrs).reduce((obj, key) => {
    const value = node.attrs[key];
    const transObj = strTrans(key, value, strCollect);
    const transData = Object.values(transObj)[0];
    return { ...obj, ...transObj };
  }, {});
  node.attrs = attrsObj;
};

module.exports = (curryTransFunc, strCollect) => (tree) => {
  const traverseContent = curryTransFunc(true);
  const traverseAttr = curryTransFunc();
  tree.match({}, (node) => {
    nodeContentHandler(traverseContent, node, strCollect);
    nodeAttrsHandler(traverseAttr, node, strCollect);
    return node;
  });
};

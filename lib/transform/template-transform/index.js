const posthtml = require("posthtml");
const domTrans = require("./dom-trans-plugin");
const htmlParser = require("./html-parser").default;

const transform = (strTrans) => (strCollect) => (source) => {
  return posthtml([domTrans(strTrans, strCollect)])
    .process(source, { parser: htmlParser })
    .then((result) => result.html);
};


module.exports = transform

const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { default: generate } = require("@babel/generator");
const t = require("@babel/types");

const { checkToTranslate } = require("../utils/rules");

const transform = (strTrans) => (strCollect) => (source) => {
  if (!source) return source;
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "flow"],
  });
  traverse(ast, {
    // jsx:: <div name="中文"></div> => <div name={"中文"}></div>，再交由StringLiteral处理
    JSXAttribute(path) {
      if (!path.node.value) return;
      const { type, value } = path.node.value;
      if (type === "StringLiteral") {
        if (!checkToTranslate(value)) return;
        path.node.value = t.JSXExpressionContainer(t.stringLiteral(value));
      }
    },
    // jsx:: <div>中文</div> => <div>{'中文'}</div>，再交由StringLiteral处理
    JSXText(path) {
      const { value } = path.node;
      if (!checkToTranslate(value)) return;
      path.replaceWith(t.JSXExpressionContainer(t.stringLiteral(value)));
    },
    TemplateLiteral(path) {
      // const value = path.getSource(); // 会报错,自己还原source
      const { expressions, quasis } = path.node;
      const value = generate(path.node).code;
      if (!checkToTranslate(value)) return;
      const transText = strTrans(value, path, strCollect);
      if (transText === value) return;
      path.replaceWithSourceString(transText);
    },
    StringLiteral(path) {
      const { value } = path.node;
      if (!checkToTranslate(value)) return;
      const transText = strTrans(value, path, strCollect);
      if (transText === value) return;
      path.replaceWithSourceString(transText);
    },
  });
  const { code } = generate(
    ast,
    {
      jsescOption: {
        minimal: true,
      },
    },
    source
  );
  return code;
};

module.exports = transform;

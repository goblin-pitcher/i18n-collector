const { Parser, ParserOptions } = require("htmlparser2");

const defaultOptions = {
  lowerCaseTags: false,
  lowerCaseAttributeNames: false,
  decodeEntities: false,
};

const defaultDirectives = [
  {
    name: "!doctype",
    start: "<",
    end: ">",
  },
];

const parser = (html, options = {}) => {
  const bufArray = [];
  const results = [];
  let attrCache = {};
  function bufferArrayLast() {
    return bufArray[bufArray.length - 1];
  }

  function isDirective(directive, tag) {
    if (directive.name instanceof RegExp) {
      const regex = new RegExp(directive.name.source, "i");
      return regex.test(tag);
    }

    if (tag !== directive.name) {
      return false;
    }

    return true;
  }

  function normalizeArributes(attrs, attrInfoObj) {
    const result = {};
    Object.keys(attrs).forEach((key) => {
      const object = {};
      const attrInfo = attrInfoObj[key];
      if (!(attrInfo && attrInfo.value) && !attrInfo.quote) {
        object[key] = true;
      } else {
        object[key] = attrs[key].replace(/&quot;/g, '"');
      }
      Object.assign(result, object);
    });

    return result;
  }

  function onprocessinginstruction(name, data) {
    const directives = defaultDirectives.concat(options.directives || []);
    const last = bufferArrayLast();

    directives.forEach((directive) => {
      const directiveText = directive.start + data + directive.end;
      if (isDirective(directive, name.toLowerCase())) {
        if (last === undefined) {
          results.push(directiveText);
          return;
        }

        if (typeof last === "object") {
          if (last.content === undefined) {
            last.content = [];
          }

          last.content.push(directiveText);
        }
      }
    });
  }

  function oncomment(data) {
    const comment = `<!--${data}-->`;
    const last = bufferArrayLast();

    if (last === undefined) {
      results.push(comment);
      return;
    }

    if (typeof last === "object") {
      if (last.content === undefined) {
        last.content = [];
      }

      last.content.push(comment);
    }
  }

  function onopentag(tag, attrs) {
    const buf = { tag };

    if (Object.keys(attrs).length > 0) {
      buf.attrs = normalizeArributes(attrs, attrCache);
    }
    attrCache = {};
    bufArray.push(buf);
  }

  function onclosetag() {
    const buf = bufArray.pop();

    if (buf) {
      const last = bufferArrayLast();

      if (bufArray.length <= 0) {
        results.push(buf);
        return;
      }

      if (typeof last === "object") {
        if (last.content === undefined) {
          last.content = [];
        }

        last.content.push(buf);
      }
    }
  }

  function ontext(text) {
    const last = bufferArrayLast();

    if (last === undefined) {
      results.push(text);
      return;
    }

    if (typeof last === "object") {
      if (last.content && last.content.length > 0) {
        const lastContentNode = last.content[last.content.length - 1];
        if (
          typeof lastContentNode === "string" &&
          !lastContentNode.startsWith("<!--")
        ) {
          last.content[last.content.length - 1] = `${lastContentNode}${text}`;
          return;
        }
      }

      if (last.content === undefined) {
        last.content = [];
      }

      last.content.push(text);
    }
  }

  function onattribute(key, value, quote) {
    attrCache[key] = { value, quote };
  }

  const parser = new Parser(
    {
      onprocessinginstruction,
      oncomment,
      onopentag,
      onclosetag,
      onattribute,
      ontext,
    },
    { ...defaultOptions, ...options }
  );

  parser.write(html);
  parser.end();

  return results;
};

exports.default = parser;

const fs = require('fs');
const path = require('path');

const { rplArrayMerge } = require('./utils/common');

const configName = "i18n-collect.config.js";
const configPath = path.resolve(process.cwd(), configName);

const defConfig = {
  dir: path.resolve(process.cwd(), './'),
  ignoredir: [],
  fix: true,
  output: 'zh-CN.js',
  file: {
    template: { prefix: "$t" },
    js: {
      addImport: {
        from: "@/utils/i18n.utils",
        data: ["i18n"],
      },
      prefix: "i18n.t",
    },
    vue: { prefix: "this.$t", sparePrefix: 'i18n.t' }
  }
};
const getConfig = () => {
  let cusConfig = {};
  if(fs.existsSync(configPath)) {
    cusConfig = { ...require(configPath) };
    cusConfig.dir = path.resolve(process.cwd(), cusConfig.dir);
  }
  return rplArrayMerge({}, defConfig, cusConfig)
}

module.exports = getConfig;
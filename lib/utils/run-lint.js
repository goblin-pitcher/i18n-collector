const { exec } = require("child_process");
const { promisify } = require("util");
const pExec = promisify(exec);
const lint = (filePath) => {
  const options = {
    env: { ...process.env, cwd: filePath },
  };
  // console.log("options:::::", options);
  return pExec(`npx eslint --fix --ext .js,.vue ./`, options);
};

module.exports = lint;

const path = require("path");
const webpack = require("webpack");

module.exports = (env = {}) => {
  const solverType = env.solver || "fast";
  const challengeUrl = JSON.stringify(
    env.CHALLENGE_URL || "http://localhost:8080/v0/challenge"
  );

  return {
    mode: env.mode || "production",
    entry: "./src/main.js",
    output: {
      filename: `${solverType}.js`,
      path: path.resolve(__dirname, "dist"),
    },
    resolve: {
      alias: {
        solver: path.resolve(__dirname, `src/solvers/${solverType}.js`),
      },
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        CHALLENGE_URL: challengeUrl,
      }),
    ],
  };
};

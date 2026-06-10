const path = require("path");
const webpack = require("webpack");

module.exports = (env = {}) => {
  const solverType = env.solver || "fast";

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
          use: [
            "style-loader",
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [["cssnano"]],
                },
              },
            },
          ],
        },
      ],
    },
  };
};

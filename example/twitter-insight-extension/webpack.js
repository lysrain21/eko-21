const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  devtool: false,
  entry: {
    background: path.resolve(__dirname, "src/background/index.ts"),
    sidebar: path.resolve(__dirname, "src/sidebar/index.tsx"),
    content: path.resolve(__dirname, "src/content/index.ts"),
    options: path.resolve(__dirname, "src/options/index.tsx"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "public", to: "." },
      ],
    }),
  ],
};

const path = require("path");

module.exports = {
  target: "node",
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "lib"),
    filename: "main.js"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  plugins: [],
  mode: "production"
};

import CopyPlugin from "copy-webpack-plugin";
import path from "path";

export default {
  mode: "production",
  entry: {
    content: "./src/content/content.js",
    background: "./src/background/background.js",
  },
  output: {
    path: path.resolve("dist"),
    filename: "[name].js",
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve("manifest.json"),
          to: path.resolve("dist"),
        },
        {
          from: path.resolve("src/images"),
          to: path.resolve("dist/images"),
        },

        {
          from: path.resolve("scripts/prof_research_topics.json"),
          to: path.resolve("dist/prof_research_topics.json"),
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
            options: {
              esModule: false,
            },
          },
        ],
      },
      {
        test: /.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
};

// resources used:
/*
https://webpack.js.org/loaders/css-loader/,
https://youtu.be/4pblrWgsMI0?si=YvnI0wXKfVYGcIP8

*/

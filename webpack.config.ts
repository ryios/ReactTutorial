import path from 'path';
import Glob from 'glob';
import webpack, { EvalSourceMapDevToolPlugin } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';  //generate the index.html and handle script inserts (local dev only, not useful in production) it could be though, circle back
import MiniCssExtractPlugin, { loader } from 'mini-css-extract-plugin'; //extract css chunks into css files (after sass etc processing)
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

//some reused vars for webpack config
const nodeModulesRegex = /[\\/]node_modules[\\/]/;
const tsRegex = /\.(ts|js)x?$/i;
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;

//recursive function for finding chunks for splitChunks
function recursiveIssuer(m: any, c: any): any {
  const issuer = c.moduleGraph.getIssuer(m);
  // For webpack@4 issuer = m.issuer
  if (issuer) {
    return recursiveIssuer(issuer, c);
  }
  const chunks = c.chunkGraph.getModuleChunks(m);
  // For webpack@4 chunks = m._chunks
  for (const chunk of chunks) {
    return chunk.name;
  }
  return false;
}
//wrapper function to have something to export because this config is in type script
let createWebPackConfig = (env: any): webpack.Configuration => {
  const isEnvDevelopment = env.development === true;
  const isEnvProduction = env.production === true;
  const outputFileName: string = 'appBundle_[contenthash].js';

  let config: webpack.Configuration = {
    mode: isEnvDevelopment ? 'development' : 'production',
    output: {
      publicPath: "/",
      filename: outputFileName,
      clean: true
    },
    entry: {
      //this entry point is just for separating vendor styles from app styles so bootstrap etc isn't in the app styles
      vendorStylesEntry: {
        import: './src/vendor/scss/vendor.scss'
      },
      //app entry for index.tsx, will bundle the app, and optimizations will pull out the vendor depedendencies not counting the vendor style sheets      
      appEntry: {
        import: './src/index.tsx',
      }
    },
    plugins: [
      new RemoveEmptyScriptsPlugin(),
      //uses a template index.html to handle local dev test site for react, automatically injects necessary script tags into body
      new HtmlWebpackPlugin({
        template: "src/index.html",
        inject: 'body', //tells webpack to generate script links for index.html in body instead of header so we don't need something like document.ready from jQuery
        scriptLoading: 'blocking'
      }),
      //the plugin config for extracting css from css module chunks
      new MiniCssExtractPlugin({
        filename: '[name]_[contenthash].css'
      }),
      new webpack.HotModuleReplacementPlugin()
    ],
    module: {
      rules: [
        {
          //this rule will match scss style sheets anywhere in src and node_modules
          test: sassRegex,
          include: [
            path.resolve('./node_modules/'),
            path.resolve('./src/')
          ],
          use: [
            MiniCssExtractPlugin.loader,
            {
              // translates CSS into CommonJS modules
              loader: 'css-loader',
              options: {
                modules: false,
                esModule: false,
                importLoaders: 1
              }
            },
            {
              // compiles Sass to CSS
              loader: 'sass-loader',
              options: {
                implementation: 'node-sass',
                sourceMap: true
              }
            }]
        },
        {
          test: tsRegex,
          exclude: nodeModulesRegex,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
            },
          },
        },
      ]
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".scss", ".jsx"],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        hidePathInfo: true,
        name: false,
        cacheGroups: {
          chunks: 'all',
          appStyles: {
            name: 'app',
            test: (m: any, c: any, entry = 'appEntry') =>
              m.constructor.name === 'CssModule' &&
              recursiveIssuer(m, c) === entry,
            chunks: 'all',
            enforce: true,
          },
          vendorStyles: {
            name: 'vendorStyles',
            test: (m: any, c: any, entry = 'vendorStylesEntry') =>
              m.constructor.name === 'CssModule' &&
              recursiveIssuer(m, c) === entry,
            chunks: 'all',
            enforce: true,
          },
          vendorScripts: {
            test: nodeModulesRegex,
            filename: 'vendorBundle_[chunkhash].js'
          }
        }
      }
    },
    devtool: "source-map",
    devServer: {
      contentBase: path.join(__dirname, "dist"),
      historyApiFallback: true,
      port: 4000,
      open: true,
      hot: true
    },
  };
  return config;
}

export default createWebPackConfig;
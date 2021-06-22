import path from "path";
import webpack, { EvalSourceMapDevToolPlugin } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin, { loader } from "mini-css-extract-plugin";

const nodeModulesRegex = /[\\/]node_modules[\\/]/;
const tsRegex = /\.(ts|js)x?$/i;
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;

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

let doWebPackConfig = (env: any): webpack.Configuration => {
  const isEnvDevelopment = env.development === true;
  const isEnvProduction = env.production === true;
  const outputFileName: string = '[contenthash]_[name].min.js';

  let config: webpack.Configuration = {
    target: 'es5',
    mode: isEnvDevelopment ? 'development' : 'production',
    output: {
      publicPath: "/",
      filename: outputFileName,
      clean: true
    },
    entry: {
      app: {
        import: './src/index.tsx'
      },
      vendorStyles: {
        import: './src/vendor/scss/vendor.scss'
      }
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "src/index.html",
        inject: 'body', //tells webpack to generate script links for index.html in body instead of header so we don't need something like document.ready from jQuery
        scriptLoading: 'blocking'
      }),
      new MiniCssExtractPlugin({
        filename: '[contenthash]_[name].css',
        chunkFilename: '[contenthash]_[id].css',
        ignoreOrder: true
      }),
      new webpack.HotModuleReplacementPlugin()
    ],
    module: {
      rules: [
        {
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
      extensions: [".tsx", ".ts", ".js"],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        hidePathInfo: true,
        cacheGroups: {
          chunks: 'all',
          appStyles: {
            filename: '[contenthash]_app.css',
            name: 'app.css',
            test: (m: any, c: any, entry = 'app') =>
              m.constructor.name === 'CssModule' &&
              recursiveIssuer(m, c) === entry,
            chunks: 'all',
            enforce: true,
          },
          vendorStyles: {
            name: 'vendor.css',
            filename: '[contenthash]_vendor.bundle.css',
            test: (m: any, c: any, entry = 'vendorStyles') =>
              m.constructor.name === 'CssModule' &&
              recursiveIssuer(m, c) === entry,
            chunks: 'all',
            enforce: true,
          },
          vendor: {
            test: nodeModulesRegex,
            filename: '[contenthash]_vender.bundle.js'
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

export default doWebPackConfig;



// export default config;
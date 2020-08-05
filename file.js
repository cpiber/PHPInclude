// Shorthand for extensions
module.exports = exports = {
  GenericFile: require('./build/fileTypes/file').default,
  Base64File: require('./build/fileTypes/base64').default,
  PhpFile: require('./build/fileTypes/php').default,
  WebpackFile: require('./build/fileTypes/webpack').default,
  JsFile: require('./build/fileTypes/js').default
};
const argv = require('minimist')(process.argv);
const env = process.env.NODE_ENV || 'production';

export { argv, env };
const argv = process.argv;
const env = ['production', 'development', 'none'].indexOf(process.env.NODE_ENV) !== -1 ? process.env.NODE_ENV as 'production' | 'development' | 'none' : 'production';

export { argv, env };
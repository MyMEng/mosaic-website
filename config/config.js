var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    port = process.env.PORT || 3000,
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'mosaic-website'
    },
    port: port,
  },

  test: {
    root: rootPath,
    app: {
      name: 'mosaic-website'
    },
    port: port,
  },

  production: {
    root: rootPath,
    app: {
      name: 'mosaic-website'
    },
    port: port,
  }
};

module.exports = config[env];

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /desktop[\\\/].*/,
  /website[\\\/].*/,
  /docs[\\\/].*/,
];

module.exports = config;

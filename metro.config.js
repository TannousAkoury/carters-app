const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const adminRoot = path.resolve(__dirname, "admin").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The Next.js admin app owns this directory. Its generated .next files are
// replaced during builds and must not be watched by the Expo/Metro process.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList].filter(Boolean)),
  new RegExp(`^${adminRoot}[\\\\/].*`),
];

module.exports = config;

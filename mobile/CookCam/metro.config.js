const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration with essential fixes
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  // Explicitly set the project root to the current directory
  projectRoot: __dirname,
  watchFolders: [__dirname],

  transformer: {
    // Enable inline requires for lazy loading of non-critical modules
    inlineRequires: true,
  },

  resolver: {
    // Block unnecessary directories from Metro watching (excluding essential dist folders)
    blockList: [
      // Backend and documentation folders
      /.*\/backend\/.*/,
      /.*\/docs\/.*/,
      /.*\/website\/.*/,
      /.*\/Public\/.*/,
      /.*\/scripts\/.*/,

      // Node modules subdirectories that can cause issues (keeping dist folders accessible)
      /.*\/node_modules\/.*\/docs\/.*/,
      /.*\/node_modules\/.*\/\.git\/.*/,
      /.*\/node_modules\/.*\/example\/.*/,
      /.*\/node_modules\/.*\/examples\/.*/,
      /.*\/node_modules\/.*\/test\/.*/,
      /.*\/node_modules\/.*\/tests\/.*/,
      /.*\/node_modules\/.*\/__tests__\/.*/,
      /.*\/node_modules\/.*\/spec\/.*/,
      /.*\/node_modules\/.*\/coverage\/.*/,

      // Platform-specific exclusions
      /.*\/android\/build\/.*/,
      /.*\/ios\/build\/.*/,
      /.*\/ios\/Pods\/.*/,
      /.*\/.gradle\/.*/,
      /.*\/.idea\/.*/,

      // Cache and temporary directories
      /.*\/.metro-cache\/.*/,
      /.*\/\.tmp\/.*/,
      /.*\/tmp\/.*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

const { withAppBuildGradle } = require('@expo/config-plugins');

const withIAPStore = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Add the missingDimensionStrategy to the defaultConfig
    const newBuildGradle = buildGradle.replace(
      /defaultConfig\s*{/,
      `defaultConfig {
        missingDimensionStrategy 'store', 'play'`
    );
    
    config.modResults.contents = newBuildGradle;
    return config;
  });
};

module.exports = withIAPStore; 
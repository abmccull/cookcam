const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withIAPConfig(config) {
  return withGradleProperties(config, (config) => {
    // Add the flag to resolve the react-native-iap ambiguity
    config.modResults.push({
      type: 'property',
      key: 'withPlayServices_iap',
      value: 'true',
    });

    return config;
  });
}; 
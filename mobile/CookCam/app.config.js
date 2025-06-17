import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || 'CookCam',
    slug: 'cookcamexpo',
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    extra: {
      eas: {
        projectId: 'dd1a18d1-591b-4ea4-a300-6f0c4cdcec87'
      },
      // Environment variables - accessible via Constants.expoConfig.extra
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      API_BASE_URL: process.env.API_BASE_URL,
      APP_NAME: process.env.APP_NAME,
      APP_VERSION: process.env.APP_VERSION,
      APP_BUILD_NUMBER: process.env.APP_BUILD_NUMBER,
      ENABLE_PUSH_NOTIFICATIONS: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
      ENABLE_CRASH_REPORTING: process.env.ENABLE_CRASH_REPORTING === 'true',
      ENABLE_BETA_FEATURES: process.env.ENABLE_BETA_FEATURES === 'true',
      ENABLE_FLIPPER: process.env.ENABLE_FLIPPER === 'true',
      ENABLE_DEV_MENU: process.env.ENABLE_DEV_MENU === 'true',
      ENABLE_HOT_RELOAD: process.env.ENABLE_HOT_RELOAD === 'true',
      ENABLE_OFFLINE_MODE: process.env.ENABLE_OFFLINE_MODE === 'true'
    },
    android: {
      package: 'com.abmccull.cookcamexpo',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      }
    },
    ios: {
      bundleIdentifier: 'com.abmccull.cookcamexpo',
      supportsTablet: true
    },
    owner: 'abmccull',
    plugins: [
      'react-native-iap'
    ],
    web: {
      favicon: './assets/favicon.png'
    }
  }
}; 
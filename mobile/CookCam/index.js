/**
 * @format
 */

import 'react-native-url-polyfill/auto'; // Fix URL.protocol errors
import 'react-native-reanimated'; // This MUST be at the top
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

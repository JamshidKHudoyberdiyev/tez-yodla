// Sentry: xato xabarlarida asl kod qatorlari ko'rinishi uchun (source map).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);

/**
 * Ilova faqat tik (portrait) ekranda ishlaydi. Android buni avtomatik «talab» qilib qo'yadi — shu sabab Play
 * ba'zi planshet/kompyuterlarga o'rnatishni yopadi. Bu plagin talabni ixtiyoriy qiladi (required=false).
 */
const { withAndroidManifest } = require('expo/config-plugins');

const NAME = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const features = (manifest['uses-feature'] ?? []).filter((f) => f.$?.['android:name'] !== NAME);
    features.push({ $: { 'android:name': NAME, 'android:required': 'false' } });
    manifest['uses-feature'] = features;
    return c;
  });
};

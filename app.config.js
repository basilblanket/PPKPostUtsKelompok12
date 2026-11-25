const base = require("./app.json");
module.exports = () => ({
  expo: {
    ...base.expo,
    android: {
      ...base.expo.android,
      package: "com.kelompok12.ruangpraktikum",
      ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY
        ? {
            config: {
              googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
            },
          }
        : {}),
    },
    ios: {
      ...base.expo.ios,
      bundleIdentifier: "com.kelompok12.ruangpraktikum",
    },
    extra: {
      ...base.expo.extra,
      ...(process.env.EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
        : {}),
    },
  },
});

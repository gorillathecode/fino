module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Explicit Hermes profile for native builds — prevents private class
          // fields and other modern syntax from reaching Hermes untranspiled.
          // babel-preset-expo auto-detects this, but an explicit value is a
          // reliable fallback when the Metro caller chain doesn't pass engine info.
          unstable_transformProfile: 'hermes-stable',
        },
      ],
    ],
  };
};

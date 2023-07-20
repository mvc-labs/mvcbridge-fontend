const env = require('dotenv').config().parsed
module.exports = {
  plugins: {
    // tailwindcss: {},

    //
    autoprefixer: {
      overrideBrowserslist: [
        'Android 4.1',
        'iOS 7.1',
        'Chrome > 31',
        'ff > 31',
        'ie >= 8',
        'last 10 versions', //
      ],
    },
    'postcss-nesting': {},
    //
    'postcss-pxtorem': {
      rootValue: 100, //
      propList: ['*'],
      replace: false,
      mediaQuery: false,
      unitPrecision: 5,
    },
  },
}

const env = require('dotenv').config().parsed
module.exports = {
  plugins: {
    // tailwindcss: {},

    // css前缀自动补全
    autoprefixer: {
      overrideBrowserslist: [
        'Android 4.1',
        'iOS 7.1',
        'Chrome > 31',
        'ff > 31',
        'ie >= 8',
        'last 10 versions', // 所有主流浏览器最近10版本用
      ],
    },
    'postcss-nesting': {},
    // 自动把px 转化为 rem
    'postcss-pxtorem': {
      rootValue: 100, // 设计稿宽度 / 10
      propList: ['*'],
      replace: false,
      mediaQuery: false,
      unitPrecision: 5,
    },
  },
}

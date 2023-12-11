import { createApp } from 'vue'
import App from '@/App.vue'
import 'element-plus/lib/components/loading/style/index'
import 'element-plus/lib/components/message/style/index'
import 'element-plus/lib/components/message-box/style/index'
import 'element-plus/lib/components/overlay/style/index'
import 'element-plus/lib/components/drawer/style/index'
import 'element-plus/lib/components/switch/style/index'
import 'normalize.css/normalize.css'
import { router } from '@/router'
import { createPinia } from 'pinia'
import i18n from '@/utils/i18n'
import Icon from '@/components/Icon/Icon.vue'
import './index.scss'
import * as filters from '@/utils/filters'
const app = createApp(App)
//
// 挂载全局过滤器
// @ts-ignore
app.config.globalProperties.$filters = {
  ...filters,
}

const pinia = createPinia()
app.component('Icon', Icon)
app.use(pinia).use(router).use(i18n).mount('#app')

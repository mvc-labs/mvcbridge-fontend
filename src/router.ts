import { createRouter, createWebHistory, RouterView } from 'vue-router'
export const routerHistory = createWebHistory()
export const router = createRouter({
  history: routerHistory,
  strict: true,
  routes: [
    {
      path: '/',
      redirect: () => {
        return { name: 'home' }
      },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/home/index.vue'),
      meta: { keepAlive: true },
    },
  ],
})

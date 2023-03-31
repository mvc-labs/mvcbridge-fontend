<template>
  <svg aria-hidden="true" :class="iconClass">
    <use :xlink:href="symbolId" :fill="fillColor" />
  </svg>
</template>

<script lang="ts" setup>
// import { useRootStore } from '@/stores/root'
import { defineComponent, computed } from 'vue'

interface Props {
  name: string
  prefix?: string
  color?: string
  customClass?: string
  useColorClass?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  prefix: 'icon',
})
// const rootStore = useRootStore()
const iconClass = computed(() => {
  return props.customClass ? props.customClass + ' icon' : 'icon'
})
const symbolId = computed(() => `#${props.prefix}-${props.name}`)
const fillColor = computed(() => {
  if (props.color) return props.color
  if (props.useColorClass) return 'currentColor'
  return '#303133'
  //   return rootStore.theme === 'dark' ? '#fff' : '#303133'
})
</script>

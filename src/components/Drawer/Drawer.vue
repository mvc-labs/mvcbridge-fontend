<template>
  <el-drawer
    :model-value="drawerOperate"
    @close="emit('update:drawerOperate', false)"
    direction="rtl"
    size="50%"
  >
    <slot name="content"></slot>
    <el-drawer
      :model-value="innerDrawer"
      :append-to-body="true"
      @close="emit('update:innerDrawer', false)"
    >
      <template #header>
        <slot name="header"></slot>
      </template>

      <slot name="innerContent"></slot>
    </el-drawer>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
interface Props {
  drawerOperate: boolean
  innerDrawer?: boolean
}

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:drawerOperate', 'update:innerDrawer'])
</script>

<style lang="scss" scoped></style>

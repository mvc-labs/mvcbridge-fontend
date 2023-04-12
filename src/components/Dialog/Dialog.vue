<template>
  <el-dialog
    :custom-class="props?.hasCustomClass ? props?.hasCustomClass : ''"
    :append-to-body="true"
    :model-value="modelValue"
    @close="dialogClose()"
    center
  >
    <template #title>
      <slot name="title"></slot>
    </template>
    <slot name="content"></slot>

    <template #footer>
      <slot name="footer"></slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
interface Props {
  modelValue: boolean
  hasCustomClass?: string
}
const props = withDefaults(defineProps<Props>(), {
  hasCustomClass: '',
})

function dialogClose() {
  emit('cancel')
  emit('update:modelValue', false)
}

const emit = defineEmits(['update:modelValue', 'confrim', 'cancel'])
</script>

<style lang="scss" scoped></style>

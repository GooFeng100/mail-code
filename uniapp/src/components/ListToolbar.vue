<template>
  <view class="toolbar">
    <view class="search-row">
      <wd-search
        v-model="innerKeyword"
        :placeholder="placeholder"
        hide-cancel
        placeholder-left
        custom-class="toolbar-search"
        @search="emitSearch"
        @clear="emitSearch"
      />
      <wd-button custom-class="filter-btn" plain @click="emit('filter')">筛选</wd-button>
    </view>
    <view class="chips">
      <view v-for="chip in chips" :key="chip.label" class="chip" @click="chip.onClick?.()">
        <text>{{ chip.label }}</text>
        <text class="arrow">⌄</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder: string
  chips: Array<{ label: string; onClick?: () => void }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search'): void
  (e: 'filter'): void
}>()

const innerKeyword = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    innerKeyword.value = value
  }
)

watch(innerKeyword, (value) => {
  emit('update:modelValue', value)
})

function emitSearch() {
  emit('search')
}
</script>

<style scoped lang="scss">
.toolbar {
  padding: 24rpx 24rpx 8rpx;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.toolbar-search {
  flex: 1;
}

.filter-btn {
  width: 144rpx !important;
  height: 76rpx !important;
  border-radius: 20rpx !important;
  font-size: 28rpx !important;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 18rpx;
}

.chip {
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #eaf3ff;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.arrow {
  font-size: 24rpx;
}
</style>

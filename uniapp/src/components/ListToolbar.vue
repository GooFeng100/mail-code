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
      <wd-button v-if="showFilterButton" custom-class="filter-btn" plain @click="emit('filter')">筛选</wd-button>
    </view>
    <view v-if="showChips" class="chips">
      <view v-for="chip in chips" :key="chip.label" class="chip" @click="chip.onClick?.()">
        <text>{{ chip.label }}</text>
        <text v-if="chip.removable" class="chip-remove" @click.stop="chip.onRemove?.()">×</text>
        <text v-else class="arrow">⌄</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder: string
  chips: Array<{ label: string; onClick?: () => void; removable?: boolean; onRemove?: () => void }>
  showFilterButton?: boolean
  showChips?: boolean
}>(), {
  showFilterButton: true,
  showChips: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search'): void
  (e: 'filter'): void
}>()

const innerKeyword = ref(props.modelValue)
const showFilterButton = computed(() => props.showFilterButton)
const showChips = computed(() => props.showChips)

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
  padding: 22rpx 24rpx 22rpx;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.toolbar-search {
  flex: 1;
}

:deep(.toolbar-search .wd-search) {
  background: transparent !important;
}

:deep(.toolbar-search) {
  background: transparent !important;
  padding: 0 !important;
}

:deep(.toolbar-search .wd-search__input) {
  background: #f5f7fb !important;
  border: 1rpx solid #d0d5dd !important;
  border-radius: 999rpx !important;
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

.chip-remove {
  width: 28rpx;
  height: 28rpx;
  border-radius: 999rpx;
  background: rgba(17, 85, 217, 0.14);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  line-height: 1;
}
</style>

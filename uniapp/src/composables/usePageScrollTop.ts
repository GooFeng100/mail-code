import { ref } from 'vue'
import { onPageScroll } from '@dcloudio/uni-app'

export function usePageScrollTop() {
  const scrollTop = ref(0)

  onPageScroll((event) => {
    scrollTop.value = event.scrollTop
  })

  return { scrollTop }
}

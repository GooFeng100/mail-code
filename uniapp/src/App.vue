<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { checkAppUpdate } from '@/common/checkUpdate'

onLaunch(() => {
  checkAppUpdate()
})
</script>

<style lang="scss">
@import './styles/theme.scss';
@import './styles/common.scss';
</style>

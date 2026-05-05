import { reactive } from 'vue'

export type ConfirmIcon = 'danger' | 'warning' | 'info'

export interface ActionResult {
  success?: boolean
  message?: string
  error?: string
}

type ConfirmHandler = () => Promise<ActionResult | boolean | void> | ActionResult | boolean | void

interface ConfirmOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  icon?: ConfirmIcon
  successText?: string
  onConfirm?: ConfirmHandler
}

interface ConfirmState {
  show: boolean
  loading: boolean
  title: string
  content: string
  confirmText: string
  cancelText: string
  icon: ConfirmIcon
  successText: string
}

export const confirmState = reactive<ConfirmState>({
  show: false,
  loading: false,
  title: '',
  content: '',
  confirmText: '确定',
  cancelText: '取消',
  icon: 'danger',
  successText: '操作成功'
})

let resolver: ((value: boolean) => void) | null = null
let confirmHandler: ConfirmHandler | null = null

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  if (resolver) resolver(false)

  confirmState.title = options.title || '确认操作'
  confirmState.content = options.content
  confirmState.confirmText = options.confirmText || '确定'
  confirmState.cancelText = options.cancelText || '取消'
  confirmState.icon = options.icon || 'danger'
  confirmState.successText = options.successText || '操作成功'
  confirmState.loading = false
  confirmState.show = true
  confirmHandler = options.onConfirm || null

  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function closeConfirm(confirmed: boolean) {
  confirmState.show = false
  confirmState.loading = false
  confirmHandler = null
  if (resolver) {
    resolver(confirmed)
    resolver = null
  }
}

export async function runConfirm() {
  if (confirmState.loading) return

  if (!confirmHandler) {
    closeConfirm(true)
    return
  }

  confirmState.loading = true
  try {
    const result = await confirmHandler()

    if (result === false) {
      throw new Error('操作失败')
    }

    if (result && typeof result === 'object' && result.success === false) {
      throw new Error(result.error || '操作失败')
    }

    const successMessage =
      result && typeof result === 'object' && result.message
        ? result.message
        : confirmState.successText

    uni.showToast({ title: successMessage, icon: 'none' })
    closeConfirm(true)
  } catch (error: any) {
    const errorMessage = error?.message || '操作失败'
    uni.showToast({ title: errorMessage, icon: 'none' })
    closeConfirm(false)
  } finally {
    confirmState.loading = false
  }
}

export function confirmDanger(content: string, title = '危险操作', onConfirm?: ConfirmHandler) {
  return showConfirm({
    title,
    content,
    icon: 'danger',
    onConfirm
  })
}

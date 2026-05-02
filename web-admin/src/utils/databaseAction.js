import { ElNotification } from "element-plus"
import { playErrorSound, playSuccessSound } from "./soundFeedback"

function mockDatabaseRequest(successMessage) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ message: successMessage })
    }, 700)
  })
}

export async function submitWithFeedback({
  setLoading,
  action,
  successMessage = "操作成功",
  errorMessage = "操作失败，请稍后重试。",
  onSuccess,
}) {
  setLoading(true)

  try {
    const result = action ? await action() : await mockDatabaseRequest(successMessage)
    ElNotification({
      title: "操作成功",
      message: result?.message || successMessage,
      type: "success",
      position: "top-right",
    })
    playSuccessSound()
    onSuccess?.(result)
    return true
  } catch (error) {
    ElNotification({
      title: "操作失败",
      message: error?.data?.error || error?.message || errorMessage,
      type: "error",
      position: "top-right",
    })
    playErrorSound()
    return false
  } finally {
    setLoading(false)
  }
}

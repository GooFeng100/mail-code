import { ElNotification } from "element-plus"

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
    onSuccess?.(result)
    return true
  } catch (error) {
    ElNotification({
      title: "操作失败",
      message: error?.response?.data?.message || error?.message || errorMessage,
      type: "error",
      position: "top-right",
    })
    return false
  } finally {
    setLoading(false)
  }
}

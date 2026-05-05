import { API_BASE_URL } from './config'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface HttpOptions {
  url: string
  method?: Method
  data?: Record<string, unknown> | string | number | Array<unknown>
  header?: Record<string, string>
}

export interface ApiResponse<T> {
  code?: number
  message?: string
  data: T
}

export function getToken() {
  return uni.getStorageSync('token') || ''
}

export function setToken(token: string) {
  uni.setStorageSync('token', token)
}

export function clearToken() {
  uni.removeStorageSync('token')
}

export function http<T>(options: HttpOptions): Promise<T> {
  const token = getToken()

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success: (res) => {
        const statusCode = res.statusCode || 0
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`HTTP ${statusCode}`))
          return
        }

        const body = res.data as ApiResponse<T> | T
        if (body && typeof body === 'object' && 'data' in body) {
          const apiBody = body as ApiResponse<T>
          if (apiBody.code && apiBody.code !== 200 && apiBody.code !== 0) {
            reject(new Error(apiBody.message || '接口请求失败'))
            return
          }
          resolve(apiBody.data)
        } else {
          resolve(body as T)
        }
      },
      fail: (err) => reject(err)
    })
  })
}

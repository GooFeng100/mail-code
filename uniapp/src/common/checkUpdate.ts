const UPDATE_MANIFEST_URL = 'https://m.889100.xyz/app-updates/version.json'

interface UpdateManifest {
  wgtVersion?: string
  wgtUrl?: string
  apkVersion?: string
  apkUrl?: string
  force?: boolean
  note?: string
}

function parseVersion(version: string): number[] {
  return String(version || '')
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((num) => (Number.isFinite(num) ? num : 0))
}

function isRemoteVersionNewer(remoteVersion: string, localVersion: string): boolean {
  const remote = parseVersion(remoteVersion)
  const local = parseVersion(localVersion)
  const maxLength = Math.max(remote.length, local.length)

  for (let i = 0; i < maxLength; i += 1) {
    const remotePart = remote[i] ?? 0
    const localPart = local[i] ?? 0
    if (remotePart > localPart) return true
    if (remotePart < localPart) return false
  }

  return false
}

function fetchUpdateManifest(): Promise<UpdateManifest> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: UPDATE_MANIFEST_URL,
      method: 'GET',
      success: (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Fetch version manifest failed: HTTP ${res.statusCode || 0}`))
          return
        }
        resolve((res.data || {}) as UpdateManifest)
      },
      fail: reject
    })
  })
}

function getRuntimeVersion(plusApi: any): Promise<string> {
  return new Promise((resolve, reject) => {
    plusApi.runtime.getProperty(plusApi.runtime.appid, (widgetInfo: any) => {
      const currentVersion = String(widgetInfo?.version || '').trim()
      if (!currentVersion) {
        reject(new Error('Cannot read current runtime version'))
        return
      }
      resolve(currentVersion)
    })
  })
}

function showUpdateConfirm(manifest: UpdateManifest): Promise<boolean> {
  return new Promise((resolve) => {
    const note = manifest.note ? `\n\nNotes: ${manifest.note}` : ''
    uni.showModal({
      title: 'New Update Available',
      content: `Detected version ${manifest.wgtVersion || ''}. Update now?${note}`,
      confirmText: 'Update',
      cancelText: 'Later',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false)
    })
  })
}

function downloadWgtAndInstall(plusApi: any, wgtUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.showLoading({ title: 'Downloading...', mask: true })
    uni.downloadFile({
      url: wgtUrl,
      success: (downloadRes) => {
        if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
          uni.hideLoading()
          reject(new Error(`Download failed: HTTP ${downloadRes.statusCode || 0}`))
          return
        }

        plusApi.runtime.install(
          downloadRes.tempFilePath,
          { force: true },
          () => {
            uni.hideLoading()
            uni.showModal({
              title: 'Update Installed',
              content: 'The app will restart to apply update.',
              showCancel: false,
              success: () => {
                plusApi.runtime.restart()
                resolve()
              },
              fail: () => {
                plusApi.runtime.restart()
                resolve()
              }
            })
          },
          (installErr: any) => {
            uni.hideLoading()
            reject(new Error(String(installErr?.message || 'Install failed')))
          }
        )
      },
      fail: (err) => {
        uni.hideLoading()
        reject(err)
      }
    })
  })
}

export async function checkAppUpdate() {
  // #ifdef APP-PLUS
  try {
    const plusApi = (globalThis as any).plus
    if (!plusApi?.runtime) return

    const [manifest, localVersion] = await Promise.all([fetchUpdateManifest(), getRuntimeVersion(plusApi)])
    const remoteVersion = String(manifest.wgtVersion || '').trim()
    const remoteWgtUrl = String(manifest.wgtUrl || '').trim()

    if (!remoteVersion || !remoteWgtUrl) return
    if (!isRemoteVersionNewer(remoteVersion, localVersion)) return

    const confirmed = await showUpdateConfirm(manifest)
    if (!confirmed) return

    await downloadWgtAndInstall(plusApi, remoteWgtUrl)
  } catch (err) {
    console.warn('[checkAppUpdate] failed:', err)
  }
  // #endif
}


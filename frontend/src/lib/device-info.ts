export interface DeviceInfo {
  device: string
  browser: string
  os: string
  userAgent: string
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return { device: 'Unknown', browser: 'Unknown', os: 'Unknown', userAgent: '' }
  }

  const ua = navigator.userAgent

  const device = detectDevice(ua)
  const browser = detectBrowser(ua)
  const os = detectOS(ua)

  return { device, browser, os, userAgent: ua }
}

function detectDevice(ua: string): string {
  if (/Mobi|Android.*Mobile|iPhone|iPod/.test(ua)) {
    return 'Mobile'
  }
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) {
    return 'Tablet'
  }
  return 'Desktop'
}

function detectBrowser(ua: string): string {
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera'
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari'
  return 'Unknown'
}

function detectOS(ua: string): string {
  if (ua.includes('Windows NT')) return 'Windows'
  if (ua.includes('Mac OS X')) {
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
    return 'macOS'
  }
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('CrOS')) return 'ChromeOS'
  return 'Unknown'
}
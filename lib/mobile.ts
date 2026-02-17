import { headers } from 'next/headers'

export async function isMobile(): Promise<boolean> {
  const headersList = await headers()
  const ua = headersList.get('user-agent') || ''
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)
}

export function isMobileUA(ua: string): boolean {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)
}

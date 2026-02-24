/**
 * 네이버 비밀번호 암호화/복호화 유틸리티
 * AES-256-GCM 사용
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.BLOG_ENCRYPTION_KEY || ''
  if (hex.length === 64) {
    return Buffer.from(hex, 'hex')
  }
  // 키 미설정 시 환경변수 기반으로 파생 (운영환경에서는 반드시 BLOG_ENCRYPTION_KEY 설정 필요)
  const fallback = (process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_SITE_URL || 'default-key-change-me')
    .repeat(4).substring(0, 32)
  return Buffer.from(fallback, 'utf8')
}

export function encryptPassword(password: string): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptPassword(encryptedStr: string): string {
  const key = getKey()
  const parts = encryptedStr.split(':')
  if (parts.length !== 3) {
    throw new Error('잘못된 암호화 형식')
  }
  const [ivHex, tagHex, dataHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

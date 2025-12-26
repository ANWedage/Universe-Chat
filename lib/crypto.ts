// End-to-end encryption utilities using Web Crypto API

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

// Derive a cryptographic key from a passphrase
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('universe-chat-salt'), // In production, use a random salt per user
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

// Generate a conversation key based on both user IDs
function getConversationPassphrase(userId1: string, userId2: string): string {
  // Sort IDs to ensure same key regardless of who sends the message
  const sortedIds = [userId1, userId2].sort()
  return `conversation:${sortedIds[0]}:${sortedIds[1]}`
}

// Encrypt a message
export async function encryptMessage(
  content: string,
  senderId: string,
  receiverId: string
): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)

    // Generate conversation-specific key
    const passphrase = getConversationPassphrase(senderId, receiverId)
    const key = await deriveKey(passphrase)

    // Generate a random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    )

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedData), iv.length)

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

// Decrypt a message
export async function decryptMessage(
  encryptedContent: string,
  senderId: string,
  receiverId: string
): Promise<string> {
  try {
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedContent)
        .split('')
        .map((c) => c.charCodeAt(0))
    )

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encryptedData = combined.slice(12)

    // Generate conversation-specific key
    const passphrase = getConversationPassphrase(senderId, receiverId)
    const key = await deriveKey(passphrase)

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    )

    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedData)
  } catch (error) {
    // Return error indicator without throwing
    return '[Unable to decrypt]'
  }
}

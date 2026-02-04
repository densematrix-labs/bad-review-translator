/**
 * API service — handles all backend calls.
 */

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
  return response.json()
}

// ==================== Translation API ====================

interface TranslateRequest {
  review: string
  source: string
  language: string
  device_id?: string
  token?: string
}

interface TranslateResponse {
  original: string
  user_really_means: string
  boss_hears: string
  source: string
  language: string
}

export async function translateReview(req: TranslateRequest): Promise<TranslateResponse> {
  return request<TranslateResponse>('/translate-review', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

// ==================== Trial API ====================

interface TrialStatus {
  has_free_trial: boolean
  uses_remaining: number
}

export async function getTrialStatus(deviceId: string): Promise<TrialStatus> {
  return request<TrialStatus>(`/trial-status/${deviceId}`)
}

// ==================== Payment API ====================

interface Product {
  sku: string
  name: string
  price_cents: number
  generations: number
  discount_percent: number | null
}

interface CreateCheckoutRequest {
  product_sku: string
  device_id: string
  optional_email?: string
  success_url: string
  cancel_url: string
}

interface CreateCheckoutResponse {
  checkout_url: string
  session_id: string
}

export async function getProducts(): Promise<Product[]> {
  return request<Product[]>('/payment/products')
}

export async function createCheckout(
  req: CreateCheckoutRequest
): Promise<CreateCheckoutResponse> {
  return request<CreateCheckoutResponse>('/payment/create-checkout', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

// ==================== Tokens API ====================

interface TokenInfo {
  token: string
  remaining_generations: number
  total_generations: number
  expires_at: string
  product_sku: string
}

interface TokenListResponse {
  tokens: TokenInfo[]
}

export async function getTokenInfo(token: string): Promise<TokenInfo> {
  return request<TokenInfo>(`/tokens/info/${token}`)
}

export async function getTokensByDevice(deviceId: string): Promise<TokenInfo[]> {
  try {
    const data = await request<TokenListResponse>(`/tokens/by-device/${deviceId}`)
    return data.tokens
  } catch {
    return []
  }
}

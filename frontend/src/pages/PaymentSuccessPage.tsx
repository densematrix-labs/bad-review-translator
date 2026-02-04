/**
 * Payment Success Page — Shows after Creem checkout redirect.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTokenStore } from '../stores/tokenStore'
import { getTokensByDevice } from '../services/api'
import { getDeviceId } from '../lib/fingerprint'
import './PaymentSuccessPage.css'

export default function PaymentSuccessPage() {
  const { t } = useTranslation()
  const { addToken, tokens } = useTokenStore()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchTokens() {
      try {
        const deviceId = await getDeviceId()
        const serverTokens = await getTokensByDevice(deviceId)

        for (const serverToken of serverTokens) {
          const exists = tokens.some((t) => t.token === serverToken.token)
          if (!exists) {
            addToken({
              token: serverToken.token,
              remaining_generations: serverToken.remaining_generations,
              expires_at: serverToken.expires_at,
            })
            setToken(serverToken.token)
          }
        }

        if (!token && serverTokens.length > 0) {
          setToken(serverTokens[0].token)
        }
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTokens()
  }, [addToken, tokens])

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const truncate = (t: string) =>
    t.length > 24 ? `${t.slice(0, 12)}...${t.slice(-12)}` : t

  return (
    <div className="success-page">
      <div className="success-icon">✓</div>

      <h1>{t('success.title')}</h1>
      <p className="success-subtitle">{t('success.subtitle')}</p>

      {loading ? (
        <div className="token-card loading">
          <p>{t('success.loading')}</p>
        </div>
      ) : token ? (
        <div className="token-card">
          <p className="token-label">{t('success.tokenLabel')}</p>
          <div className="token-value">
            <code>{truncate(token)}</code>
            <button className="copy-token-btn" onClick={handleCopy}>
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <p className="token-hint">{t('success.tokenHint')}</p>
        </div>
      ) : null}

      <div className="success-actions">
        <Link to="/" className="action-btn primary">
          {t('success.startUsing')} →
        </Link>
        <Link to="/pricing" className="action-btn outline">
          {t('success.buyMore')}
        </Link>
      </div>
    </div>
  )
}

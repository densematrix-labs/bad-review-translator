/**
 * Pricing Page — Translation credits purchase.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { createCheckout } from '../services/api'
import { getDeviceId } from '../lib/fingerprint'
import './PricingPage.css'

const products = [
  {
    sku: 'translate_pack_3',
    generations: 3,
    price_cents: 799,
    popular: true,
  },
  {
    sku: 'translate_pack_10',
    generations: 10,
    price_cents: 1999,
    discount_percent: 25,
    popular: false,
  },
]

const features = [
  'pricing.features.ai',
  'pricing.features.sources',
  'pricing.features.languages',
  'pricing.features.copy',
]

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function PricingPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handlePurchase = async (sku: string) => {
    setLoading(sku)
    setError('')
    try {
      const deviceId = await getDeviceId()
      const response = await createCheckout({
        product_sku: sku,
        device_id: deviceId,
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/pricing`,
      })
      window.location.href = response.checkout_url
    } catch {
      setError(t('pricing.error'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="pricing-page">
      <nav className="pricing-nav">
        <Link to="/" className="back-link">← {t('pricing.backHome')}</Link>
      </nav>

      <header className="pricing-header">
        <h1>{t('pricing.title')}</h1>
        <p className="pricing-subtitle">{t('pricing.subtitle')}</p>
        <p className="pricing-trial">{t('pricing.trialNote')}</p>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="pricing-grid">
        {products.map((product) => (
          <div
            key={product.sku}
            className={`pricing-card ${product.popular ? 'popular' : ''}`}
          >
            {product.popular && (
              <span className="popular-badge">{t('pricing.popular')}</span>
            )}

            <h2 className="plan-name">
              {product.generations} {t('pricing.translations')}
            </h2>

            <div className="plan-price">
              <span className="price-amount">{formatCurrency(product.price_cents)}</span>
              {product.discount_percent && (
                <span className="discount-badge">
                  {t('pricing.save')} {product.discount_percent}%
                </span>
              )}
            </div>

            <p className="price-per-unit">
              {formatCurrency(Math.round(product.price_cents / product.generations))}{' '}
              {t('pricing.perTranslation')}
            </p>

            <button
              className={`buy-btn ${product.popular ? 'primary' : 'outline'}`}
              disabled={loading !== null}
              onClick={() => handlePurchase(product.sku)}
            >
              {loading === product.sku ? t('pricing.processing') : t('pricing.buyNow')}
            </button>

            <ul className="features-list">
              {features.map((featureKey) => (
                <li key={featureKey}>✓ {t(featureKey)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

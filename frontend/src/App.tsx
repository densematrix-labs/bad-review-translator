import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTokenStore } from './stores/tokenStore';
import { getDeviceId } from './lib/fingerprint';
import { getTrialStatus, translateReview } from './services/api';
import './App.css';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'ES' },
];

const SOURCES = ['appstore', 'restaurant', 'ecommerce', 'hotel', 'other'] as const;

interface TranslateResult {
  original: string;
  user_really_means: string;
  boss_hears: string;
  source: string;
  language: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const [review, setReview] = useState('');
  const [source, setSource] = useState<string>('appstore');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [hasFreeTrial, setHasFreeTrial] = useState<boolean | null>(null);

  const { getActiveToken, getTotalGenerations, updateTokenUsage } = useTokenStore();
  const activeToken = getActiveToken();
  const totalCredits = getTotalGenerations();

  // Initialize device ID and check trial status
  useEffect(() => {
    async function init() {
      const id = await getDeviceId();
      setDeviceId(id);
      try {
        const status = await getTrialStatus(id);
        setHasFreeTrial(status.has_free_trial);
      } catch {
        // If API fails (no DB yet), assume trial available
        setHasFreeTrial(true);
      }
    }
    init();
  }, []);

  const canTranslate = hasFreeTrial || totalCredits > 0;

  const handleTranslate = async () => {
    if (!review.trim() || !deviceId) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload: {
        review: string;
        source: string;
        language: string;
        device_id?: string;
        token?: string;
      } = {
        review: review.trim(),
        source,
        language: i18n.language,
      };

      // Use paid token if available, otherwise fall back to free trial
      if (activeToken) {
        payload.token = activeToken.token;
      } else {
        payload.device_id = deviceId;
      }

      const data = await translateReview(payload);
      setResult(data);

      // Update local token state after successful use
      if (activeToken) {
        updateTokenUsage(activeToken.token, activeToken.remaining_generations - 1);
      } else {
        // Free trial used, update status
        setHasFreeTrial(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('error');
      if (message.includes('402') || message.includes('trial') || message.includes('Token')) {
        setError(t('needCredits'));
        setHasFreeTrial(false);
      } else {
        setError(t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="app">
      <header>
        <nav className="lang-switcher">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => changeLang(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </nav>
        <h1>{t('title')}</h1>
        <p className="subtitle">{t('subtitle')}</p>

        {/* Credits indicator + pricing link */}
        <div className="credits-bar">
          {totalCredits > 0 ? (
            <span className="credits-count">
              {t('creditsRemaining', { count: totalCredits })}
            </span>
          ) : hasFreeTrial ? (
            <span className="credits-count free-trial">
              {t('freeTrialAvailable')}
            </span>
          ) : (
            <span className="credits-count no-credits">
              {t('noCredits')}
            </span>
          )}
          <Link to="/pricing" className="pricing-link">
            {t('buyCredits')}
          </Link>
        </div>
      </header>

      <main>
        <div className="input-section">
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={t('reviewPlaceholder')}
            rows={5}
            maxLength={1000}
          />

          <div className="controls">
            <div className="source-select">
              <label>{t('sourceLabel')}</label>
              <div className="source-buttons">
                {SOURCES.map((s) => (
                  <button
                    key={s}
                    className={`source-btn ${source === s ? 'active' : ''}`}
                    onClick={() => setSource(s)}
                  >
                    {t(`sources.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="translate-btn"
              onClick={handleTranslate}
              disabled={loading || !review.trim() || !canTranslate}
            >
              {loading ? t('translating') : !canTranslate ? t('buyToTranslate') : t('translateBtn')}
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {result && (
          <div className="result-section">
            <div className="result-card original">
              <h3>{t('original')}</h3>
              <p>{result.original}</p>
            </div>

            <div className="comparison">
              <div className="result-card user-means">
                <h3>{t('userMeans')}</h3>
                <p>{result.user_really_means}</p>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(result.user_really_means, 'user')}
                >
                  {copied === 'user' ? t('copied') : t('copy')}
                </button>
              </div>

              <div className="result-card boss-hears">
                <h3>{t('bossHears')}</h3>
                <p>{result.boss_hears}</p>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(result.boss_hears, 'boss')}
                >
                  {copied === 'boss' ? t('copied') : t('copy')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}

export default App;

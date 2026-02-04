import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

  const handleTranslate = async () => {
    if (!review.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/translate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: review.trim(),
          source,
          language: i18n.language,
        }),
      });

      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      setResult(data);
    } catch {
      setError(t('error'));
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
              disabled={loading || !review.trim()}
            >
              {loading ? t('translating') : t('translateBtn')}
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

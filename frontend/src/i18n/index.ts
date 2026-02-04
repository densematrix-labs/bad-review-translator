import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import zh from './locales/zh/translation.json';
import ja from './locales/ja/translation.json';
import de from './locales/de/translation.json';
import fr from './locales/fr/translation.json';
import ko from './locales/ko/translation.json';
import es from './locales/es/translation.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
  de: { translation: de },
  fr: { translation: fr },
  ko: { translation: ko },
  es: { translation: es },
};

const browserLang = navigator.language.split('-')[0];
const supportedLangs = Object.keys(resources);

i18n.use(initReactI18next).init({
  resources,
  lng: supportedLangs.includes(browserLang) ? browserLang : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

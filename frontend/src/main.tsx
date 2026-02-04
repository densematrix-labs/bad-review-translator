import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './i18n'
import App from './App.tsx'
import PricingPage from './pages/PricingPage.tsx'
import PaymentSuccessPage from './pages/PaymentSuccessPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalConfig'
import './index.css'
import App from './App.jsx'

msalInstance.initialize()
  .then(() => msalInstance.handleRedirectPromise().catch(err => {
    console.error('MSAL redirect error:', err);
  }))
  .then(() => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </StrictMode>,
    )
  })
  .catch(err => {
    console.error('Fatal init error:', err);
    document.getElementById('root').innerHTML =
      '<p style="font-family:sans-serif;padding:2rem;color:#555">Error al inicializar la aplicación. Recargá la página.</p>';
  })

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: {
            fontSize: '13px',
            fontFamily: 'Manrope, sans-serif',
          },
        }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

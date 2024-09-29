import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ImageProcessorProvider } from './context/ImageProcessorContext.tsx'


import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImageProcessorProvider>
      <App />
      <ToastContainer />
    </ImageProcessorProvider>
  </StrictMode>,
)

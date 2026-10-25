import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-expect-error CSS imports are handled by the bundler.
import './main.css'
import Home from './Home.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)

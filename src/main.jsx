import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import '@xyflow/react/dist/style.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

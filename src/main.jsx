import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import ToggleKeyword from './reusables/toggle_keyword.jsx'

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <App />
    <ToggleKeyword title='Hello'/>
    <ToggleKeyword title='Hello'/>
    <ToggleKeyword title='Hello'/>
  </StrictMode>,
)

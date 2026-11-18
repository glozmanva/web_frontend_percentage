import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { store } from './state/store'
import './deposit_month.css'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <BrowserRouter><App /></BrowserRouter>
  </Provider>,
)

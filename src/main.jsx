import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Menu from './Menu.jsx'
import Admin from './Admin.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<main className="wrap"><h1>Menuto</h1><p>Дигитално меню за твоето заведение. <a href="/admin">Вход за собственици</a></p></main>} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/:slug" element={<Menu />} />
    </Routes>
  </BrowserRouter>
)

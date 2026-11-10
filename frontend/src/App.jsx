import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn, getUser } from './api'
import LoginPage from './pages/LoginPage'
import PartiesPage from './pages/PartiesPage'
import CharacterCreatePage from './pages/CharacterCreatePage'
import GamePage from './pages/GamePage'
import AdminPage from './pages/AdminPage'
import PendingPage from './pages/PendingPage'

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  const user = getUser()
  if (user && !user.is_approved && !user.is_admin) return <Navigate to="/pending" replace />
  return children
}

function AdminRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  const user = getUser()
  if (!user?.is_admin) return <Navigate to="/parties" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route
          path="/admin"
          element={<AdminRoute><AdminPage /></AdminRoute>}
        />
        <Route
          path="/parties"
          element={<ProtectedRoute><PartiesPage /></ProtectedRoute>}
        />
        <Route
          path="/party/:partyId/create-character"
          element={<ProtectedRoute><CharacterCreatePage /></ProtectedRoute>}
        />
        <Route
          path="/party/:partyId"
          element={<ProtectedRoute><GamePage /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to={isLoggedIn() ? "/parties" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

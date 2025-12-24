import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage/HomePage'
import LoginPage from './pages/LoginPage/LoginPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import TermsPage from './pages/TermsPage/TermsPage'       
import PrivacyPage from './pages/PrivacyPage/PrivacyPage' 
import ProtectedRoute from './components/common/ProtectedRoute/ProtectedRoute'
import DashboardPage from './pages/DashboardPage/DashboardPage'
import CollaboratorPage from './pages/CollaboratorPage/CollaboratorPage'
import HistoryPage from './pages/HistoryPage/HistoryPage'
import UserProfilePage from './pages/UserProfilePage/UserProfilePage'
import AdminPage from './pages/AdminPage/AdminPage'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirección raíz a home */}
        <Route path="/" element={<Navigate to="/home" />} />
        
        {/* Ruta de la landing page */}
        <Route path="/home" element={<HomePage />} />
        
        {/* Ruta de login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Ruta de registro */}
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Nuevas rutas para términos y privacidad */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
              <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute>
              <HistoryPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
              <UserProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/collaborator" element={
          <ProtectedRoute>
            <CollaboratorPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        
        {/* Ruta 404 - redirige a home */}
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
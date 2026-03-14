import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import PrivateRoute from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Officers from './pages/Officers';
import './App.css';

// Layout wrapper component
const AppLayout = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
  // Check if we're on the landing page
  const isLandingPage = location.pathname === '/';
  
  if (!user) {
    // Not logged in
    if (isLandingPage) {
      // Landing page - no navbar, just content
      return <div className="App">{children}</div>;
    } else {
      // Login page - no navbar
      return <div className="App">{children}</div>;
    }
  }
  
  // Logged in - show sidebar
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            
            {/* Private Routes */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/members" 
              element={
                <PrivateRoute>
                  <Members />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/officers" 
              element={
                <PrivateRoute>
                  <Officers />
                </PrivateRoute>
              } 
            />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
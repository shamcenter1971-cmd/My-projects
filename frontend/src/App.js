import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import "@/App.css";

// Components
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import BehaviorAnalyzer from "./components/BehaviorAnalyzer";
import ReinforcementBank from "./components/ReinforcementBank";
import PairingPage from "./components/PairingPage";
import SkillsModule from "./components/SkillsModule";
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('mithaq_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchUserData(userData.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const response = await axios.get(`${API}/dashboard/${userId}`);
      setUser(response.data.user);
      setPartner(response.data.partner);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    localStorage.setItem('mithaq_user', JSON.stringify(userData));
    await fetchUserData(userData.id);
  };

  const handleLogout = () => {
    setUser(null);
    setPartner(null);
    localStorage.removeItem('mithaq_user');
  };

  const handlePairSuccess = (partnerData) => {
    setPartner(partnerData);
    fetchUserData(user.id); // Refresh user data
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-emerald-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                <PairingPage 
                  user={user} 
                  onPairSuccess={handlePairSuccess}
                  onLogout={handleLogout}
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="App" dir="rtl">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                user={user} 
                partner={partner} 
                onLogout={handleLogout}
                onRefresh={() => fetchUserData(user.id)}
              />
            } 
          />
          <Route 
            path="/behavior-analyzer" 
            element={
              <BehaviorAnalyzer 
                user={user} 
                partner={partner}
                onBack={() => window.history.back()}
              />
            } 
          />
          <Route 
            path="/reinforcement-bank" 
            element={
              <ReinforcementBank 
                user={user} 
                partner={partner}
                onBack={() => window.history.back()}
              />
            } 
          />
          <Route 
            path="/skills" 
            element={
              <SkillsModule 
                user={user} 
                partner={partner}
                onBack={() => window.history.back()}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
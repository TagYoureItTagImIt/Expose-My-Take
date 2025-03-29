import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import NewPrediction from './pages/NewPrediction';
import { AuthProvider } from './contexts/AuthContext';
import Predictions from './pages/Predictions';
import Groups from './pages/Groups';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900 text-white">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/new-prediction" element={<NewPrediction />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/groups" element={<Groups />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './components/HomePage';
import PricingPage from './components/PricingPage';
import InstructionScreen from './components/InstructionScreen';
import LoginScreen from './components/LoginScreen';
import ResultScreen from './components/ResultScreen';
import ProfileDashboard from './components/ProfileDashboard';
import StudentExamInterface from './components/StudentExamInterface';
import AdminPanel from './components/AdminPanel';

const container = document.getElementById('root');
if (!container) {
  throw new Error("Could not find root element to mount to");
}
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/dashboard" element={<ProfileDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/instructions/:examId" element={<InstructionScreen />} />
          <Route path="/exam/:examId" element={<StudentExamInterface />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import HomePage from './components/HomePage';
import PricingPage from './components/PricingPage';
import AuthRedirectHandler from './components/AuthRedirectHandler';
import UpdatePassword from './components/UpdatePassword';
import LoadingScreen from './components/LoadingScreen';

// Lazy-loaded heavy routes
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const StudentExamInterface = React.lazy(() => import('./components/StudentExamInterface'));
const ExamReview = React.lazy(() => import('./components/ExamReview'));
const ExamResults = React.lazy(() => import('./components/ExamResults'));
const InstructionScreen = React.lazy(() => import('./components/InstructionScreen'));
const LoginScreen = React.lazy(() => import('./components/LoginScreen'));
const ProfileDashboard = React.lazy(() => import('./components/ProfileDashboard'));
const ResultScreen = React.lazy(() => import('./components/ResultScreen'));

const container = document.getElementById('root');
if (!container) {
  throw new Error('Could not find root element to mount to');
}
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen message="Loading page" subtext="Fetching resources..." />}>
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
            <Route path="/exam-results/:submissionId" element={<ExamResults />} />
            <Route path="/exam-review/:submissionId" element={<ExamReview />} />
            <Route path="/auth/callback" element={<AuthRedirectHandler />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="*" element={<h1>404 Not Found</h1>} />
          </Route>
        </Routes>
      </Suspense>
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);

import React from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Courses from './src/pages/Courses';
import CourseDetail from './src/pages/CourseDetail';
import CourseWorkspace from './src/pages/CourseWorkspace';
import Feed from './src/pages/Feed';
import NotFound from './src/pages/NotFound';
import Community from './src/pages/Community';
import Profile from './src/pages/Profile';
import Auth from './src/pages/Auth';
import { AuthProvider } from './src/context/AuthContext';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <Theme appearance="inherit" radius="large" scaling="100%">
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <main className="min-h-screen font-inter">
              <Routes>
                {/* Set Courses as the default landing page for the preview */}
                <Route path="/" element={<Auth />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/community" element={<Community />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/course/:courseId" element={<CourseDetail />} />
                <Route path="/workspace/:courseId" element={<CourseWorkspace />} />
                <Route path="/auth" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ToastContainer
                position="top-right"
                autoClose={3000}
                newestOnTop
                closeOnClick
                pauseOnHover
              />
            </main>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </Theme>
  );
}

export default App;
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Sources from './pages/Sources';
import Topics from './pages/Topics';
import Posts from './pages/Posts';
import Keys from './pages/Keys';
import Storage from './pages/Storage';
import Social from './pages/Social';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sources" element={<Sources />} />
          <Route path="topics" element={<Topics />} />
          <Route path="posts" element={<Posts />} />
          <Route path="keys" element={<Keys />} />
          <Route path="storage" element={<Storage />} />
          <Route path="social" element={<Social />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

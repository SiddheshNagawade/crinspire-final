import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { upsertProfileFromClient } from '../utils/profile';

const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Finalizing login...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. Check if we already have a session (Supabase client handles the hash automatically)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          // Ensure profile exists
          if (session.user) {
             await upsertProfileFromClient(session.user);
          }
          navigate('/dashboard');
          return;
        }

        // 2. If no session yet, listen for the event
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            if (session.user) {
                await upsertProfileFromClient(session.user);
            }
            navigate('/dashboard');
          } else if (event === 'PASSWORD_RECOVERY') {
            navigate('/update-password');
          }
        });

        return () => {
          subscription.unsubscribe();
        };

      } catch (error: any) {
        console.error('Auth redirect error:', error);
        setStatus(`Login failed: ${error.message}`);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <div className="text-lg font-semibold text-gray-700">{status}</div>
      </div>
    </div>
  );
};

export default AuthRedirectHandler;

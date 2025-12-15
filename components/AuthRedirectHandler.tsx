import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase appended type=recovery, route immediately
    try {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get('type');
      if (typeParam === 'recovery') {
        navigate('/update-password');
        setLoading(false);
        return;
      }
    } catch {}

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // User arrived from a magic link or email-based auth
      if (event === 'SIGNED_IN' && session) {
        // Normal magic-link / email-confirmation flow
        navigate('/dashboard');
      }

      // User clicked a "reset password" email link
      else if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password');
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">Authenticating…</div>
          <div className="text-sm text-gray-500 mt-2">Please wait.</div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthRedirectHandler;

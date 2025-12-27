import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { checkCurrentUserAdminStatus } from '../utils/adminAuth';

interface LandingRedirectProps {
  children: React.ReactNode;
}

const LandingRedirect: React.FC<LandingRedirectProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!data.session) return;

      const isAdmin = await checkCurrentUserAdminStatus();
      if (!isMounted) return;

      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return <>{children}</>;
};

export default LandingRedirect;

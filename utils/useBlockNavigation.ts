import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to block navigation during exam to prevent accidental exit
 * Shows confirmation dialog if user tries to navigate away
 * On confirmation, redirects to dashboard instead of going back
 */
export const useBlockNavigation = (shouldBlock: boolean) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!shouldBlock) return;

    // Store the current location for reference
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      const confirmed = window.confirm(
        'You are still taking the exam. Are you sure you want to leave?\n\nClick OK to exit to dashboard or Cancel to continue.'
      );
      if (confirmed) {
        // Navigate to dashboard instead of going back
        navigate('/dashboard', { replace: true });
      } else {
        // Push the state back to prevent the back button effect
        window.history.pushState(null, '', location.pathname);
      }
    };

    // Push initial state
    window.history.pushState(null, '', location.pathname);

    // Listen for back button
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldBlock, location.pathname, navigate]);

  // Block React Router navigation attempts
  useEffect(() => {
    if (!shouldBlock) return;

    const handleNavigate = () => {
      const confirmed = window.confirm(
        'You are still taking the exam. Are you sure you want to leave?\n\nClick OK to exit to dashboard or Cancel to continue.'
      );
      return confirmed;
    };

    // Cleanup if needed
  }, [shouldBlock, navigate]);
};

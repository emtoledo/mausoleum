import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Auth Callback Page
 * 
 * Handles Supabase email confirmation callbacks and other auth redirects
 * This page is accessed when users click confirmation links in their email
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL (Supabase includes auth tokens here)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Handle email confirmation
        if (type === 'signup' || type === 'email') {
          // Supabase will automatically handle the session from the URL hash
          // We just need to wait for the session to be established
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            // Session established successfully, redirect to projects
            console.log('Email confirmed successfully');
            navigate('/projects', { replace: true });
          } else {
            // If no session, try to exchange the tokens
            if (accessToken && refreshToken) {
              const { data, error: exchangeError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (data.session && !exchangeError) {
                console.log('Session established from email confirmation');
                navigate('/projects', { replace: true });
              } else {
                console.error('Error establishing session:', exchangeError);
                navigate('/login?error=confirmation_failed', { replace: true });
              }
            } else {
              console.error('No tokens found in callback URL');
              navigate('/login?error=invalid_callback', { replace: true });
            }
          }
        } else {
          // Other auth types (recovery, etc.)
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            navigate('/projects', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login?error=callback_error', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div>Confirming your email...</div>
      <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we verify your account.</div>
    </div>
  );
};

export default AuthCallbackPage;


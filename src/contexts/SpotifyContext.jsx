import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSpotifyAuthUrl, exchangeCodeForToken } from '../services/spotifyService';

const SpotifyContext = createContext();

export const useSpotify = () => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};

export const SpotifyProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for existing token in localStorage
    const token = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');
    
    console.log('🔐 Checking stored token:', token ? 'Found' : 'Not found');
    console.log('🔐 Token expiry:', tokenExpiry);
    console.log('🔐 Token expiry type:', typeof tokenExpiry);
    console.log('🔐 Current time:', Date.now());
    
    if (token && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      console.log('🔐 Parsed expiry time:', expiryTime);
      console.log('🔐 Is expiry valid number:', !isNaN(expiryTime));
      
      if (!isNaN(expiryTime) && Date.now() < expiryTime) {
        console.log('🔐 Token is valid, setting authenticated state');
        setAccessToken(token);
        setIsAuthenticated(true);
      } else {
        console.log('🔐 Token is invalid or expired');
        // Clear invalid tokens
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expiry');
      }
    } else {
      console.log('🔐 No token or expiry found');
    }
  }, []);

  const authenticate = () => {
    const authUrl = getSpotifyAuthUrl();
    window.location.href = authUrl;
  };

  const handleCallback = async (code) => {
    console.log('🔐 Handling Spotify callback with code:', code);
    setIsLoading(true);
    try {
      const tokenData = await exchangeCodeForToken(code);
      console.log('🔐 Token exchange successful:', tokenData);
      
      const expiryTime = Date.now() + (tokenData.expires_in * 1000);
      console.log('🔐 Calculated expiry time:', expiryTime);
      console.log('🔐 Expires in seconds:', tokenData.expires_in);
      console.log('🔐 Expires in type:', typeof tokenData.expires_in);
      
      // Validate the expiry time before saving
      if (isNaN(expiryTime) || !tokenData.expires_in) {
        console.error('🔐 Invalid expiry time, using default 1 hour');
        const defaultExpiry = Date.now() + (3600 * 1000); // 1 hour default
        localStorage.setItem('spotify_token_expiry', defaultExpiry.toString());
      } else {
        localStorage.setItem('spotify_token_expiry', expiryTime.toString());
      }
      
      localStorage.setItem('spotify_access_token', tokenData.access_token);
      localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
      
      console.log('🔐 Tokens saved to localStorage');
      console.log('🔐 Saved expiry time:', localStorage.getItem('spotify_token_expiry'));
      
      setAccessToken(tokenData.access_token);
      setIsAuthenticated(true);
      
      console.log('🔐 Authentication state updated');
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    accessToken,
    user,
    isLoading,
    authenticate,
    handleCallback,
    logout
  };

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  );
};

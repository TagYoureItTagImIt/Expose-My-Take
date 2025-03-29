import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Helper function to get user-friendly error message
  const getUserFriendlyErrorMessage = (error: any): string => {
    const errorCode = error?.code || '';
    
    // Auth error messages
    const authErrorMessages: Record<string, string> = {
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/user-not-found': 'No account found with this email. Please check your email or sign up.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
      'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/popup-closed-by-user': 'Sign in was cancelled. Please try again.',
      'auth/operation-not-allowed': 'This sign in method is not enabled. Please contact support.',
      'auth/requires-recent-login': 'Please sign in again to continue.',
      'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials.',
    };
    
    // Return user-friendly message or a generic one if code not found
    return authErrorMessages[errorCode] || 
           'An error occurred. Please try again or contact support if the problem persists.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        await signUp(email, password, username);
      } else {
        await signIn(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
      console.error('Auth error:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <Trophy className="h-16 w-16 mx-auto text-blue-500 mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-orange-500 
                      bg-clip-text text-transparent">
          {isSignUp ? 'Join the Game' : 'Welcome Back'}
        </h2>
        <p className="text-gray-400 mt-2">
          {isSignUp 
            ? 'Create an account to start making predictions' 
            : 'Sign in to continue making predictions'}
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-700">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSignUp ? (
              <>
                <UserPlus className="h-5 w-5" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, User, LogOut, Flame, Users, List } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <Flame className="h-8 w-8 text-blue-500 transition-all group-hover:text-blue-400" />
                <Trophy className="h-8 w-8 text-orange-500 absolute top-0 left-0 transition-all 
                                opacity-0 group-hover:opacity-100 group-hover:translate-x-1 
                                group-hover:-translate-y-1" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-orange-500 
                               bg-clip-text text-transparent">
                  Expose My Take
                </span>
                <span className="text-xs text-gray-400">Where Bold Predictions Live</span>
              </div>
            </Link>
            
            {/* Navigation Links */}
            {user && (
              <div className="hidden md:flex ml-10 space-x-6">
                <Link 
                  to="/predictions" 
                  className="text-gray-300 hover:text-white transition-colors flex items-center"
                >
                  <List className="h-4 w-4 mr-1" />
                  <span>Predictions</span>
                </Link>
                <Link 
                  to="/groups" 
                  className="text-gray-300 hover:text-white transition-colors flex items-center"
                >
                  <Users className="h-4 w-4 mr-1" />
                  <span>Groups</span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link
                  to="/new-prediction"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Flame className="h-4 w-4" />
                  <span>Hot Take</span>
                </Link>
                <Link 
                  to={`/profile/${user.uid}`} 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <User className="h-6 w-6" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-primary">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
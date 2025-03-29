import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sportsData, Sport, Team, Player } from '../data/sportsData';
import { Calendar, TrendingUp, Clock, Users, Building, Award, Star } from 'lucide-react';
import { format } from 'date-fns';

type Tab = 'general' | 'standings' | 'awards';
type Status = 'all' | 'pending' | 'completed';

interface GeneralPrediction {
  id: string;
  userId: string;
  username: string;
  sport: string;
  predictionText: string;
  team: { id: string; name: string } | null;
  player: { id: string; name: string; team: string } | null;
  endDate: string;
  status: string;
  upvotes: number;
  downvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
  createdAt: Date;
}

interface StandingsPrediction {
  id: string;
  userId: string;
  username: string;
  sport: string;
  seasonYear: number | string;
  predictionData: Record<string, Record<string, Team[]>>;
  championshipPredictions: {
    conferenceWinners: Record<string, string>;
    championshipWinner: string;
  };
  createdAt: Date;
}

interface Team {
  id: string;
  name: string;
  abbreviation?: string;
  logo?: string;
}

interface AwardsPrediction {
  id: string;
  userId: string;
  username: string;
  sport: string;
  seasonYear: number | string;
  categories: Record<string, string>; // category name -> player/team id
  createdAt: Date;
}

interface Group {
  id: string;
  name: string;
  members: string[];
}

const Predictions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [generalPredictions, setGeneralPredictions] = useState<GeneralPrediction[]>([]);
  const [standingsPredictions, setStandingsPredictions] = useState<StandingsPrediction[]>([]);
  const [awardsPredictions, setAwardsPredictions] = useState<AwardsPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [availableSports, setAvailableSports] = useState<string[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [expandedPrediction, setExpandedPrediction] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);

  // Fetch all predictions to determine available filters
  useEffect(() => {
    if (!user) return;
    
    const fetchAllPredictions = async () => {
      try {
        // Fetch standings predictions
        const standingsRef = collection(db, 'standingsPredictions');
        const standingsQuery = query(
          standingsRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const standingsSnapshot = await getDocs(standingsQuery);
        const standingsData = standingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date()
        })) as StandingsPrediction[];
        
        // Fetch awards predictions
        const awardsRef = collection(db, 'awardsPredictions');
        const awardsQuery = query(
          awardsRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const awardsSnapshot = await getDocs(awardsQuery);
        const awardsData = awardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date()
        })) as AwardsPrediction[];
        
        // Combine sports and seasons from both types
        const allPredictions = [...standingsData, ...awardsData];
        const sports = [...new Set(allPredictions.map(pred => pred.sport))];
        const seasons = [...new Set(allPredictions.map(pred => String(pred.seasonYear)))];
        
        setAvailableSports(sports);
        setAvailableSeasons(seasons);
        
        // Set default selections to the most recent prediction's values
        if (allPredictions.length > 0) {
          const mostRecent = allPredictions[0]; // First item is most recent due to orderBy
          setSelectedSport(mostRecent.sport);
          setSelectedSeason(String(mostRecent.seasonYear));
        }
        
        setStandingsPredictions(standingsData);
        setAwardsPredictions(awardsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setLoading(false);
      }
    };
    
    fetchAllPredictions();
  }, [user]);

  // Fetch filtered predictions based on selected tab and filters
  useEffect(() => {
    if (!user) return;
    
    const fetchAllPredictions = async () => {
      try {
        setLoading(true);
        
        // Determine which user IDs to fetch predictions for
        const userIds = currentGroup ? currentGroup.members : [user.uid];
        
        // Fetch standings predictions
        const standingsRef = collection(db, 'standingsPredictions');
        let standingsQuery;
        
        if (userIds.length === 1) {
          standingsQuery = query(
            standingsRef,
            where('userId', '==', userIds[0]),
            orderBy('createdAt', 'desc')
          );
        } else {
          // For multiple users (group view), we need to use 'in' operator
          standingsQuery = query(
            standingsRef,
            where('userId', 'in', userIds.slice(0, 10)), // Firestore limits 'in' to 10 values
            orderBy('createdAt', 'desc')
          );
        }
        
        const standingsSnapshot = await getDocs(standingsQuery);
        const standingsData = standingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date()
        })) as StandingsPrediction[];
        
        // Similar changes for awards predictions
        const awardsRef = collection(db, 'awardsPredictions');
        let awardsQuery;
        
        if (userIds.length === 1) {
          awardsQuery = query(
            awardsRef,
            where('userId', '==', userIds[0]),
            orderBy('createdAt', 'desc')
          );
        } else {
          awardsQuery = query(
            awardsRef,
            where('userId', 'in', userIds.slice(0, 10)),
            orderBy('createdAt', 'desc')
          );
        }
        
        const awardsSnapshot = await getDocs(awardsQuery);
        const awardsData = awardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date()
        })) as AwardsPrediction[];
        
        // Combine sports and seasons from both types
        const allPredictions = [...standingsData, ...awardsData];
        const sports = [...new Set(allPredictions.map(pred => pred.sport))];
        const seasons = [...new Set(allPredictions.map(pred => String(pred.seasonYear)))];
        
        setAvailableSports(sports);
        setAvailableSeasons(seasons);
        
        // Set default selections to the most recent prediction's values
        if (allPredictions.length > 0) {
          const mostRecent = allPredictions[0]; // First item is most recent due to orderBy
          setSelectedSport(mostRecent.sport);
          setSelectedSeason(String(mostRecent.seasonYear));
        }
        
        setStandingsPredictions(standingsData);
        setAwardsPredictions(awardsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setLoading(false);
      }
    };
    
    fetchAllPredictions();
  }, [user, currentGroup]);

  // Add this effect to fetch user's groups
  useEffect(() => {
    if (!user) return;
    
    const fetchGroups = async () => {
      try {
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('members', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);
        
        const groupsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          members: doc.data().members
        })) as Group[];
        
        setUserGroups(groupsData);
        
        // If groupId is provided in URL, set current group
        if (groupId) {
          const group = groupsData.find(g => g.id === groupId);
          if (group) {
            setCurrentGroup(group);
          }
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
    
    fetchGroups();
  }, [user, groupId]);

  const groupStandingsByType = () => {
    const grouped: Record<string, StandingsPrediction[]> = {};
    
    standingsPredictions.forEach(prediction => {
      if (!grouped[prediction.predictionType]) {
        grouped[prediction.predictionType] = [];
      }
      grouped[prediction.predictionType].push(prediction);
    });
    
    return grouped;
  };

  const getChampionshipLabels = (sport: string): { 
    conferences: { [key: string]: string },
    championship: string 
  } => {
    switch (sport) {
      case 'MLB':
        return {
          conferences: {
            'American': 'AL Champion',
            'National': 'NL Champion'
          },
          championship: 'World Series Winner'
        };
      case 'NFL':
        return {
          conferences: {
            'AFC': 'AFC Champion',
            'NFC': 'NFC Champion'
          },
          championship: 'Super Bowl Winner'
        };
      case 'NBA':
        return {
          conferences: {
            'Eastern': 'Eastern Conference Champion',
            'Western': 'Western Conference Champion'
          },
          championship: 'NBA Champion'
        };
      case 'NHL':
        return {
          conferences: {
            'Eastern': 'Eastern Conference Champion',
            'Western': 'Western Conference Champion'
          },
          championship: 'Stanley Cup Winner'
        };
      default:
        return {
          conferences: {},
          championship: 'Champion'
        };
    }
  };

  const getTeamNameById = (prediction: StandingsPrediction, teamId: string): string => {
    // Search through all teams in the prediction data to find the matching team
    for (const conference in prediction.predictionData) {
      for (const division in prediction.predictionData[conference]) {
        const team = prediction.predictionData[conference][division].find(t => t.id === teamId);
        if (team) return team.name;
      }
    }
    return 'Unknown Team';
  };

  const toggleExpandPrediction = (predictionId: string) => {
    if (expandedPrediction === predictionId) {
      setExpandedPrediction(null);
    } else {
      setExpandedPrediction(predictionId);
    }
  };

  // Get player name by ID
  const getPlayerNameById = (playerId: string, sport: string): string => {
    // Find the player in the sportsData
    const player = sportsData[sport as Sport]?.players?.find(p => p.id === playerId);
    
    if (player) {
      return player.name;
    }
    
    // Fallback to ID if player not found
    return playerId;
  };

  // Get award category label
  const getAwardCategoryLabel = (sport: string, category: string): string => {
    const sportSpecificLabels: Record<string, Record<string, string>> = {
      MLB: {
        'AL_MVP': 'American League MVP',
        'NL_MVP': 'National League MVP',
        'AL_CY_YOUNG': 'American League Cy Young',
        'NL_CY_YOUNG': 'National League Cy Young',
        'AL_ROOKIE': 'American League Rookie of the Year',
        'NL_ROOKIE': 'National League Rookie of the Year',
        'HOME_RUNS': 'MLB Home Run Leader',
        'BATTING_AVG': 'MLB Batting Average Leader',
        'STRIKEOUTS': 'MLB Strikeout Leader (Pitcher)',
        'ERA': 'MLB ERA Leader',
        'STEALS': 'MLB Stolen Base Leader',
        'SAVES': 'MLB Saves Leader',
      },
      NFL: {
        'MVP': 'NFL MVP',
        'OPOY': 'Offensive Player of the Year',
        'DPOY': 'Defensive Player of the Year',
        'OROY': 'Offensive Rookie of the Year',
        'DROY': 'Defensive Rookie of the Year',
        'PASSING_YARDS': 'Passing Yards Leader',
        'RUSHING_YARDS': 'Rushing Yards Leader',
        'RECEIVING_YARDS': 'Receiving Yards Leader',
        'TOUCHDOWNS': 'Touchdown Leader',
        'SACKS': 'Sack Leader',
        'INTERCEPTIONS': 'Interception Leader',
      },
      // Add other sports as needed
    };
    
    return sportSpecificLabels[sport]?.[category] || category;
  };

  // Add this helper function
  const getPredictionErrorMessage = (error: any): string => {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    
    // Common Firestore errors
    if (errorCode.includes('permission-denied')) {
      return 'You don\'t have permission to view these predictions.';
    }
    
    if (errorCode.includes('not-found')) {
      return 'The prediction you\'re looking for doesn\'t exist or has been deleted.';
    }
    
    if (errorCode.includes('unavailable') || errorCode.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Prediction-specific errors
    if (errorMessage.includes('filter') || errorMessage.includes('query')) {
      return 'There was an issue with your filter selection. Please try a different filter.';
    }
    
    // Generic fallback
    return 'An error occurred while loading predictions. Please try again later.';
  };

  // Update the fetchGeneralPredictions function
  const fetchGeneralPredictions = async () => {
    try {
      setLoading(true);
      
      // Determine which user IDs to fetch predictions for
      const userIds = currentGroup ? currentGroup.members : [user.uid];
      
      const predictionsRef = collection(db, 'predictions');
      let predictionsQuery;
      
      // Create appropriate query based on status filter and user IDs
      if (statusFilter === 'all') {
        if (userIds.length === 1) {
          // Single user query
          predictionsQuery = query(
            predictionsRef,
            where('userId', '==', userIds[0]),
            orderBy('createdAt', 'desc')
          );
        } else {
          // Group query - handle Firestore's 'in' operator limitation (max 10 values)
          // For larger groups, you might need to make multiple queries and combine results
          predictionsQuery = query(
            predictionsRef,
            where('userId', 'in', userIds.slice(0, 10)),
            orderBy('createdAt', 'desc')
          );
        }
      } else {
        // Status filter applied
        if (userIds.length === 1) {
          predictionsQuery = query(
            predictionsRef,
            where('userId', '==', userIds[0]),
            where('status', '==', statusFilter),
            orderBy('createdAt', 'desc')
          );
        } else {
          // Note: Firestore doesn't support multiple 'in' clauses or combining 'in' with other filters
          // in the same query. For this case, we'll need to fetch all and filter in memory.
          predictionsQuery = query(
            predictionsRef,
            where('userId', 'in', userIds.slice(0, 10)),
            orderBy('createdAt', 'desc')
          );
        }
      }
      
      const snapshot = await getDocs(predictionsQuery);
      let predictions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date(),
        endDate: doc.data().endDate || new Date()
      })) as GeneralPrediction[];
      
      // If we have a status filter and are using a group query, filter in memory
      if (statusFilter !== 'all' && userIds.length > 1) {
        predictions = predictions.filter(pred => pred.status === statusFilter);
      }
      
      setGeneralPredictions(predictions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      // You could add a state variable for prediction errors and set it here
      // setFetchError(getPredictionErrorMessage(error));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchGeneralPredictions();
  }, [user, statusFilter, currentGroup]);

  return (
    <div className="min-h-screen bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Your Predictions</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/groups')}
                className="btn-secondary flex items-center"
              >
                <Users className="mr-2 h-4 w-4" />
                My Groups
              </button>
              <button
                onClick={() => navigate('/new-prediction')}
                className="btn-primary"
              >
                New Prediction
              </button>
            </div>
          </div>
          
          {/* Group selector */}
          {userGroups.length > 0 && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">View Predictions:</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setCurrentGroup(null);
                      setSearchParams({});
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      !currentGroup 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    My Predictions
                  </button>
                  
                  {userGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setCurrentGroup(group);
                        setSearchParams({ groupId: group.id });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        currentGroup?.id === group.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {currentGroup && (
                <div className="mt-3 text-sm text-gray-400">
                  Viewing predictions from all members of "{currentGroup.name}"
                </div>
              )}
            </div>
          )}
          
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('general')}
                className={`${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                General Predictions
              </button>
              <button
                onClick={() => setActiveTab('standings')}
                className={`${
                  activeTab === 'standings'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Standings Predictions
              </button>
              <button
                onClick={() => setActiveTab('awards')}
                className={`${
                  activeTab === 'awards'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Award className="h-4 w-4 mr-1" />
                Awards & Leaders
              </button>
            </nav>
          </div>
          
          {/* Filters */}
          {activeTab === 'general' ? (
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    statusFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span>All</span>
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    statusFilter === 'pending' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>Active</span>
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    statusFilter === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Completed</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex space-x-4">
              <div>
                <label htmlFor="sport" className="block text-sm font-medium text-gray-300">
                  Sport
                </label>
                <select
                  id="sport"
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-white"
                >
                  <option value="">All Sports</option>
                  {availableSports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="season" className="block text-sm font-medium text-gray-300">
                  Season
                </label>
                <select
                  id="season"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-white"
                >
                  <option value="">All Seasons</option>
                  {availableSeasons.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Content */}
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : activeTab === 'general' ? (
            // General Predictions
            <div className="space-y-4">
              {generalPredictions.length === 0 ? (
                <div className="text-center py-10 bg-gray-700 rounded-lg shadow border border-gray-600">
                  <p className="text-gray-300">No predictions found.</p>
                  <button
                    onClick={() => navigate('/new-prediction')}
                    className="mt-4 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Make a Prediction
                  </button>
                </div>
              ) : (
                generalPredictions.map(prediction => (
                  <div key={prediction.id} className={`sport-card ${prediction.sport} p-6 bg-gray-700 rounded-lg shadow border border-gray-600`}>
                    <div className="flex items-center mb-2">
                      <span className={`inline-block px-2 py-1 rounded bg-${prediction.sport.toLowerCase()}-500/20 
                                      text-${prediction.sport.toLowerCase()}-300 text-sm font-semibold mr-2`}>
                        {prediction.sport}
                      </span>
                      
                      {currentGroup && (
                        <span className="text-sm text-gray-400">
                          by {prediction.username}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{prediction.predictionText}</h3>
                    {(prediction.team || prediction.player) && (
                      <div className="flex items-center space-x-4 text-sm text-gray-300 mb-2">
                        {prediction.team && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4" />
                            <span>{prediction.team.name}</span>
                          </div>
                        )}
                        {prediction.player && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{prediction.player.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-400">
                      <span className={`${
                        prediction.status === 'pending' 
                          ? 'text-yellow-400' 
                          : prediction.status === 'correct'
                            ? 'text-green-400'
                            : 'text-red-400'
                      }`}>
                        Status: {prediction.status.charAt(0).toUpperCase() + prediction.status.slice(1)}
                      </span>
                      <span>Ends {format(new Date(prediction.endDate), 'MMM yyyy')}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Score: {prediction.upvotes - prediction.downvotes || 0}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'standings' ? (
            // Standings Predictions
            <div>
              {standingsPredictions.length === 0 ? (
                <div className="text-center py-10 bg-gray-700 rounded-lg shadow border border-gray-600">
                  <p className="text-gray-300">No standings predictions found for the selected filters.</p>
                  <button
                    onClick={() => navigate('/new-prediction')}
                    className="mt-4 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Make a Prediction
                  </button>
                </div>
              ) : (
                standingsPredictions.map(prediction => (
                  <div key={prediction.id} className="mb-6 bg-gray-700 rounded-lg shadow border border-gray-600 overflow-hidden">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => toggleExpandPrediction(prediction.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center mb-2">
                            <span className={`inline-block px-2 py-1 rounded bg-${prediction.sport.toLowerCase()}-500/20 
                                            text-${prediction.sport.toLowerCase()}-300 text-sm font-semibold mr-2`}>
                              {prediction.sport}
                            </span>
                            
                            {currentGroup && (
                              <span className="text-sm text-gray-400">
                                by {prediction.username}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold">{prediction.sport} {prediction.seasonYear} Season Prediction</h3>
                        </div>
                        <div className="text-sm text-gray-300">
                          {format(new Date(prediction.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                      
                      {/* Championship Predictions Summary */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(getChampionshipLabels(prediction.sport).conferences).map(([conference, label]) => {
                          const winnerId = prediction.championshipPredictions?.conferenceWinners?.[conference];
                          return (
                            <div key={conference} className="bg-gray-800 p-3 rounded-lg">
                              <div className="text-sm text-gray-400">{label}</div>
                              <div className="font-semibold">
                                {winnerId ? getTeamNameById(prediction, winnerId) : 'Not selected'}
                              </div>
                            </div>
                          );
                        })}
                        
                        <div className="bg-gray-800 p-3 rounded-lg border border-yellow-500/30">
                          <div className="text-sm text-yellow-400">{getChampionshipLabels(prediction.sport).championship}</div>
                          <div className="font-semibold text-yellow-300">
                            {prediction.championshipPredictions?.championshipWinner 
                              ? getTeamNameById(prediction, prediction.championshipPredictions.championshipWinner) 
                              : 'Not selected'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-400 flex items-center">
                        <span>{expandedPrediction === prediction.id ? 'Click to collapse' : 'Click to view full standings prediction'}</span>
                        <svg 
                          className={`ml-2 h-5 w-5 transition-transform ${expandedPrediction === prediction.id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Expanded View */}
                    {expandedPrediction === prediction.id && (
                      <div className="p-4 border-t border-gray-600 bg-gray-750">
                        <h4 className="text-lg font-semibold mb-4">Full Standings Prediction</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(prediction.predictionData || {}).map(([conference, divisions]) => (
                            <div key={conference} className="space-y-4">
                              <h5 className="text-md font-semibold text-blue-300">{conference}</h5>
                              
                              {Object.entries(divisions).map(([division, teams]) => (
                                <div key={division} className="bg-gray-800 rounded-lg p-3">
                                  <h6 className="text-sm font-medium text-gray-300 mb-2">{division}</h6>
                                  <div className="space-y-1">
                                    {teams.map((team, index) => (
                                      <div 
                                        key={team.id} 
                                        className="flex items-center p-2 rounded hover:bg-gray-700"
                                      >
                                        <div className="w-6 text-center text-gray-400 mr-3">{index + 1}</div>
                                        <div className="flex-1">{team.name}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            // Awards Predictions
            <div>
              {awardsPredictions.length === 0 ? (
                <div className="text-center py-10 bg-gray-700 rounded-lg shadow border border-gray-600">
                  <p className="text-gray-300">No awards predictions found for the selected filters.</p>
                  <button
                    onClick={() => navigate('/new-prediction')}
                    className="mt-4 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Make a Prediction
                  </button>
                </div>
              ) : (
                awardsPredictions.map(prediction => (
                  <div key={prediction.id} className="mb-6 bg-gray-700 rounded-lg shadow border border-gray-600 overflow-hidden">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => toggleExpandPrediction(prediction.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center mb-2">
                            <span className={`inline-block px-2 py-1 rounded bg-${prediction.sport.toLowerCase()}-500/20 
                                            text-${prediction.sport.toLowerCase()}-300 text-sm font-semibold mr-2`}>
                              {prediction.sport}
                            </span>
                            
                            {currentGroup && (
                              <span className="text-sm text-gray-400">
                                by {prediction.username}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold">{prediction.sport} {prediction.seasonYear} Awards & Leaders Prediction</h3>
                        </div>
                        <div className="text-sm text-gray-300">
                          {format(new Date(prediction.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                      
                      {/* Preview of a few awards */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(prediction.categories).slice(0, 3).map(([category, playerId]) => (
                          <div key={category} className="bg-gray-800 p-3 rounded-lg">
                            <div className="text-sm text-gray-400">{getAwardCategoryLabel(prediction.sport, category)}</div>
                            <div className="font-semibold flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              {getPlayerNameById(playerId, prediction.sport)}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-400 flex items-center">
                        <span>{expandedPrediction === prediction.id ? 'Click to collapse' : 'Click to view all awards predictions'}</span>
                        <svg 
                          className={`ml-2 h-5 w-5 transition-transform ${expandedPrediction === prediction.id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Expanded View */}
                    {expandedPrediction === prediction.id && (
                      <div className="p-4 border-t border-gray-600 bg-gray-750">
                        <h4 className="text-lg font-semibold mb-4 flex items-center">
                          <Award className="h-5 w-5 mr-2 text-yellow-500" />
                          All Awards & Leaders Predictions
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(prediction.categories).map(([category, playerId]) => (
                            <div key={category} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                              <div>
                                <div className="text-sm text-gray-400">{getAwardCategoryLabel(prediction.sport, category)}</div>
                                <div className="font-semibold">{getPlayerNameById(playerId, prediction.sport)}</div>
                              </div>
                              <Star className="h-5 w-5 text-yellow-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Predictions; 
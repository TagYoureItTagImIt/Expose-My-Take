import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, Users, Building, Award, Star } from 'lucide-react';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sportsData, Sport, Team, Player } from '../data/sportsData';
import StandingsPrediction from '../components/StandingsPrediction';
import { getUpcomingSeason } from '../utils/seasonDates';

type PredictionType = 'general' | 'standings' | 'awards';

type Prediction = {
  userId: string;
  username: string;
  sport: string;
  predictionText: string;
  team: Team | null;
  player: Player | null;
  endDate: string;
  status: string;
  pointsEarned: number;
  upvotes: number;
  downvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
};

interface ChampionshipPredictions {
  conferenceWinners: {
    [conference: string]: string; // teamId
  };
  championshipWinner: string; // teamId
}

interface AwardsPrediction {
  sport: Sport;
  seasonYear: number;
  categories: Record<string, string>; // category name -> player/team id
}

export default function NewPrediction() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [type, setType] = useState<PredictionType>('general');
  const [sport, setSport] = useState<Sport>('MLB');
  const [predictionText, setPredictionText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [endDate, setEndDate] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [standingsPredictions, setStandingsPredictions] = useState<Record<string, Record<string, Team[]>>>({});
  const [season, setSeason] = useState<{ label: string; startDate: Date; endDate: Date; } | null>(null);
  const [championshipPredictions, setChampionshipPredictions] = useState<ChampionshipPredictions>({
    conferenceWinners: {},
    championshipWinner: ''
  });
  const [awardsPredictions, setAwardsPredictions] = useState<Record<string, string>>({});
  const [existingPrediction, setExistingPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingAwardsPrediction, setExistingAwardsPrediction] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize standings predictions with current order
    if (type === 'standings' && sportsData[sport].conferences) {
      const initialPredictions: Record<string, Record<string, Team[]>> = {};
      Object.entries(sportsData[sport].conferences).forEach(([conference, divisions]) => {
        initialPredictions[conference] = {};
        Object.entries(divisions).forEach(([division, teams]) => {
          initialPredictions[conference][division] = [...(teams as Team[])];
        });
      });
      setStandingsPredictions(initialPredictions);
    }
  }, [sport, type]);

  useEffect(() => {
    if (type === 'standings') {
      const upcomingSeason = getUpcomingSeason(sport);
      setSeason(upcomingSeason);
      if (upcomingSeason) {
        setEndDate(upcomingSeason.endDate.toISOString().split('T')[0]);
      }
    }
  }, [sport, type]);

  useEffect(() => {
    const checkExistingPrediction = async () => {
      if (!user || !season || type !== 'standings') return;
      
      setLoading(true);
      try {
        const seasonYear = season.endDate.getFullYear();
        const predictionsRef = collection(db, 'standingsPredictions');
        const q = query(
          predictionsRef,
          where('userId', '==', user.uid),
          where('sport', '==', sport),
          where('seasonYear', '==', seasonYear)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setExistingPrediction(querySnapshot.docs[0].data());
        } else {
          setExistingPrediction(null);
        }
      } catch (error) {
        console.error('Error checking existing prediction:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingPrediction();
  }, [user, sport, season, type]);

  useEffect(() => {
    if (type === 'awards') {
      const upcomingSeason = getUpcomingSeason(sport);
      setSeason(upcomingSeason);
      if (upcomingSeason) {
        setEndDate(upcomingSeason.endDate.toISOString().split('T')[0]);
      }
    }
  }, [sport, type]);

  useEffect(() => {
    const checkExistingAwardsPrediction = async () => {
      if (!user || !season || type !== 'awards') return;
      
      setLoading(true);
      try {
        const seasonYear = season.endDate.getFullYear();
        const predictionsRef = collection(db, 'awardsPredictions');
        const q = query(
          predictionsRef,
          where('userId', '==', user.uid),
          where('sport', '==', sport),
          where('seasonYear', '==', seasonYear)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setExistingAwardsPrediction(querySnapshot.docs[0].data());
        } else {
          setExistingAwardsPrediction(null);
        }
      } catch (error) {
        console.error('Error checking existing awards prediction:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingAwardsPrediction();
  }, [user, sport, season, type]);

  const handleStandingsChange = (conference: string, division: string, teams: Team[]) => {
    setStandingsPredictions(prev => ({
      ...prev,
      [conference]: {
        ...prev[conference],
        [division]: teams
      }
    }));
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

  const handleConferenceWinnerChange = (conference: string, teamId: string) => {
    setChampionshipPredictions(prev => ({
      ...prev,
      conferenceWinners: {
        ...prev.conferenceWinners,
        [conference]: teamId
      },
      // Reset championship winner if it's not one of the conference winners
      championshipWinner: prev.championshipWinner === teamId ? prev.championshipWinner : ''
    }));
  };

  const handleChampionshipWinnerChange = (teamId: string) => {
    setChampionshipPredictions(prev => ({
      ...prev,
      championshipWinner: teamId
    }));
  };

  const getAwardsCategories = (sport: Sport): Record<string, { label: string; leagueSpecific?: string }> => {
    switch (sport) {
      case 'MLB':
        return {
          // League-specific awards
          'AL_MVP': { label: 'American League MVP', leagueSpecific: 'American League' },
          'NL_MVP': { label: 'National League MVP', leagueSpecific: 'National League' },
          'AL_CY_YOUNG': { label: 'American League Cy Young', leagueSpecific: 'American League' },
          'NL_CY_YOUNG': { label: 'National League Cy Young', leagueSpecific: 'National League' },
          'AL_ROOKIE': { label: 'American League Rookie of the Year', leagueSpecific: 'American League' },
          'NL_ROOKIE': { label: 'National League Rookie of the Year', leagueSpecific: 'National League' },
          
          // League-agnostic statistical leaders
          'HOME_RUNS': { label: 'MLB Home Run Leader' },
          'BATTING_AVG': { label: 'MLB Batting Average Leader' },
          'STRIKEOUTS': { label: 'MLB Strikeout Leader (Pitcher)' },
          'ERA': { label: 'MLB ERA Leader' },
          'STEALS': { label: 'MLB Stolen Base Leader' },
          'SAVES': { label: 'MLB Saves Leader' },
        };
      case 'NFL':
        return {
          'MVP': { label: 'NFL MVP' },
          'OPOY': { label: 'Offensive Player of the Year' },
          'DPOY': { label: 'Defensive Player of the Year' },
          'OROY': { label: 'Offensive Rookie of the Year' },
          'DROY': { label: 'Defensive Rookie of the Year' },
          'PASSING_YARDS': { label: 'Passing Yards Leader' },
          'RUSHING_YARDS': { label: 'Rushing Yards Leader' },
          'RECEIVING_YARDS': { label: 'Receiving Yards Leader' },
          'TOUCHDOWNS': { label: 'Touchdown Leader' },
          'SACKS': { label: 'Sack Leader' },
          'INTERCEPTIONS': { label: 'Interception Leader' },
        };
      // ... other sports remain the same ...
      default:
        return {};
    }
  };

  // Get players filtered by league if needed
  const getFilteredPlayers = (leagueSpecific?: string): Player[] => {
    if (!leagueSpecific) {
      return sportsData[sport].players;
    }
    
    // Get teams in the specified league
    const teamsInLeague: string[] = [];
    Object.entries(sportsData[sport].conferences).forEach(([conference, divisions]) => {
      if (conference.includes(leagueSpecific) || leagueSpecific.includes(conference)) {
        Object.values(divisions).forEach(teams => {
          teams.forEach(team => teamsInLeague.push(team.id));
        });
      }
    });
    
    // Filter players by teams in the league
    return sportsData[sport].players.filter(player => 
      teamsInLeague.includes(player.team)
    );
  };

  const handleAwardsPredictionChange = (category: string, playerId: string) => {
    setAwardsPredictions(prev => ({
      ...prev,
      [category]: playerId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const username = userDoc.data()?.username;

      if (type === 'general') {
        await addDoc(collection(db, 'predictions'), {
          userId: user.uid,
          username,
          sport,
          predictionText,
          team: selectedTeam,
          player: selectedPlayer,
          endDate: new Date(endDate).toISOString(),
          status: 'pending',
          pointsEarned: 0,
          upvotes: 0,
          downvotes: 0,
          upvotedBy: [],
          downvotedBy: [],
          createdAt: new Date().toISOString()
        });
      } else if (type === 'standings') {
        await addDoc(collection(db, 'standingsPredictions'), {
          userId: user.uid,
          username,
          sport,
          seasonYear: new Date(endDate).getFullYear(),
          predictionData: standingsPredictions,
          championshipPredictions,
          createdAt: new Date().toISOString()
        });
      } else if (type === 'awards') {
        await addDoc(collection(db, 'awardsPredictions'), {
          userId: user.uid,
          username,
          sport,
          seasonYear: new Date(endDate).getFullYear(),
          categories: awardsPredictions,
          createdAt: new Date().toISOString()
        });
      }
      navigate('/');
    } catch (error) {
      console.error('Error creating prediction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all teams for a conference
  const getConferenceTeams = (conference: string): Team[] => {
    const sportData = sportsData[sport];
    const conferences = sportData.conferences as Record<string, Record<string, Team[]>>;
    console.log('conferences:', conferences);
    console.log('conference:', conference);
    if (!conferences || !conferences[conference]) {
      return [];
    }
    
    // The issue is here - MLB might have different conference naming than what's used in the championship labels
    // Let's add some debugging and handle different conference naming conventions
    console.log('Looking for conference:', conference);
    console.log('Available conferences:', Object.keys(conferences));
    
    // Try to match the conference name with available conferences
    const actualConferenceName = Object.keys(conferences).find(
      conf => conf.includes(conference) || conference.includes(conf)
    ) || conference;
    
    return Object.values(conferences[actualConferenceName] || {})
      .flat()
      .filter(team => team !== undefined) as Team[];
  };

  // Filter players based on search term
  const filteredPlayers = sportsData[sport].players
    .filter(player => 
      (!selectedTeam || player.team === selectedTeam.id) && 
      (playerSearchTerm === '' || 
       player.name.toLowerCase().includes(playerSearchTerm.toLowerCase()))
    );

  // Handle player search input change
  const handlePlayerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerSearchTerm(e.target.value);
    if (!showPlayerDropdown) {
      setShowPlayerDropdown(true);
    }
  };

  // Clear player selection
  const clearPlayerSelection = () => {
    setSelectedPlayer(null);
    setPlayerSearchTerm('');
  };

  // Clear team selection
  const clearTeamSelection = () => {
    setSelectedTeam(null);
    // Also clear player selection since it depends on team
    setSelectedPlayer(null);
    setPlayerSearchTerm('');
  };

  // Handle opening team dropdown
  const handleTeamDropdownToggle = () => {
    // Close player dropdown if it's open
    if (showPlayerDropdown) {
      setShowPlayerDropdown(false);
    }
    setShowTeamDropdown(!showTeamDropdown);
  };

  // Handle opening player dropdown
  const handlePlayerDropdownToggle = () => {
    // Close team dropdown if it's open
    if (showTeamDropdown) {
      setShowTeamDropdown(false);
    }
    setShowPlayerDropdown(!showPlayerDropdown);
  };

  // Get team name by ID
  const getTeamNameById = (teamId: string): string => {
    // First check if teams is directly available
    if (sportsData[sport].teams) {
      const team = sportsData[sport].teams.find(t => t.id === teamId);
      if (team) return team.name;
    }
    
    // If not, look through conferences and divisions
    if (sportsData[sport].conferences) {
      for (const [_, divisions] of Object.entries(sportsData[sport].conferences)) {
        for (const [_, teams] of Object.entries(divisions)) {
          const team = teams.find((t: Team) => t.id === teamId);
          if (team) return team.name;
        }
      }
    }
    
    return 'Unknown Team';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Make a Prediction</h1>

      <div className="bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-700">
        <div className="mb-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setType('general')}
              className={`flex-1 btn-secondary ${
                type === 'general' ? 'bg-blue-600 hover:bg-blue-700' : ''
              }`}
            >
              General Prediction
            </button>
            <button
              onClick={() => setType('standings')}
              className={`flex-1 btn-secondary ${
                type === 'standings' ? 'bg-blue-600 hover:bg-blue-700' : ''
              }`}
            >
              Standings Prediction
            </button>
            <button
              onClick={() => setType('awards')}
              className={`flex-1 btn-secondary ${
                type === 'awards' ? 'bg-blue-600 hover:bg-blue-700' : ''
              }`}
            >
              Awards & Leaders
            </button>
          </div>
        </div>

        {type === 'standings' && loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-400">Checking existing predictions...</p>
          </div>
        ) : type === 'standings' && existingPrediction ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-yellow-500 mb-3">
              Prediction Already Exists
            </h3>
            <p className="text-gray-300 mb-4">
              You have already made a standings prediction for the {season?.label} {sport} season.
              Only one standings prediction is allowed per season.
            </p>
            <button
              onClick={() => navigate('/predictions')}
              className="btn-secondary"
            >
              View Your Predictions
            </button>
          </div>
        ) : type === 'awards' && loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-400">Checking existing predictions...</p>
          </div>
        ) : type === 'awards' && existingAwardsPrediction ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-yellow-500 mb-3">
              Prediction Already Exists
            </h3>
            <p className="text-gray-300 mb-4">
              You have already made an awards prediction for the {season?.label} {sport} season.
              Only one awards prediction is allowed per season.
            </p>
            <button
              onClick={() => navigate('/predictions')}
              className="btn-secondary"
            >
              View Your Predictions
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => {
                  setSport(e.target.value as Sport);
                  setSelectedTeam(null);
                  setSelectedPlayer(null);
                  setAwardsPredictions({});
                }}
                className="input-field"
              >
                {Object.keys(sportsData).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {type === 'general' ? (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team (Optional)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleTeamDropdownToggle}
                      className="input-field pl-10 pr-10 text-left flex items-center justify-between w-full"
                    >
                      <span>{selectedTeam?.name || 'Select a team...'}</span>
                      <Building className="h-5 w-5 text-gray-400" />
                    </button>
                    {selectedTeam && (
                      <button
                        type="button"
                        onClick={clearTeamSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    {showTeamDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {Object.values(sportsData[sport].conferences).flatMap(divisions => 
                          Object.values(divisions).flat()
                        ).map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-600"
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowTeamDropdown(false);
                              // Clear player selection when team changes
                              setSelectedPlayer(null);
                              setPlayerSearchTerm('');
                            }}
                          >
                            {team.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTeam && (
                    <div className="mt-2 px-3 py-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center">
                      <span>Selected: <span className="font-medium">{selectedTeam.name}</span></span>
                      <button
                        type="button"
                        onClick={clearTeamSelection}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Player (Optional)
                  </label>
                  <div className="relative">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={playerSearchTerm}
                        onChange={handlePlayerSearchChange}
                        onFocus={handlePlayerDropdownToggle}
                        placeholder={selectedPlayer ? selectedPlayer.name : "Search for a player..."}
                        className="input-field pl-10 pr-10 w-full"
                      />
                      <Users className="h-5 w-5 text-gray-400 absolute left-3" />
                      {(selectedPlayer || playerSearchTerm) && (
                        <button
                          type="button"
                          onClick={clearPlayerSelection}
                          className="absolute right-3 text-gray-400 hover:text-gray-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {showPlayerDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredPlayers.length === 0 ? (
                          <div className="px-4 py-2 text-gray-400">No players found</div>
                        ) : (
                          filteredPlayers.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-600"
                              onClick={() => {
                                setSelectedPlayer(player);
                                setPlayerSearchTerm('');
                                setShowPlayerDropdown(false);
                              }}
                            >
                              {player.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedPlayer && (
                    <div className="mt-2 px-3 py-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center">
                      <span>Selected: <span className="font-medium">{selectedPlayer.name}</span></span>
                      <button
                        type="button"
                        onClick={clearPlayerSelection}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Prediction
                  </label>
                  <textarea
                    value={predictionText}
                    onChange={(e) => setPredictionText(e.target.value)}
                    className="input-field h-32"
                    placeholder="Share your bold prediction..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-field pl-10"
                      required
                    />
                    <Calendar className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </>
            ) : type === 'standings' ? (
              <>
                {season ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Season
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={season.label}
                        className="input-field pl-10"
                        disabled
                      />
                      <Calendar className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                ) : (
                  <div className="text-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
                    Standings predictions are currently closed for the {sport} {new Date().getFullYear()} season.
                    Please check back later for the next season.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(sportsData[sport].conferences).map(([conference, divisions]) => (
                    <div key={conference} className="space-y-6">
                      {Object.entries(divisions).map(([division, teams]) => (
                        <StandingsPrediction
                          key={`${conference}-${division}`}
                          conference={conference}
                          division={division}
                          teams={standingsPredictions[conference]?.[division] || teams}
                          onChange={(newTeams) => handleStandingsChange(conference, division, newTeams)}
                          sport={sport}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {season ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Season
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={season.label}
                        className="input-field pl-10"
                        disabled
                      />
                      <Calendar className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    
                    <div className="mt-8 space-y-8">
                      <h3 className="text-xl font-semibold flex items-center">
                        <Award className="h-5 w-5 mr-2 text-yellow-500" />
                        Awards & Statistical Leaders
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(getAwardsCategories(sport)).map(([category, { label, leagueSpecific }]) => {
                          const filteredPlayers = getFilteredPlayers(leagueSpecific);
                          
                          return (
                            <div key={category} className="bg-gray-700 rounded-lg p-4">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                {label}
                                {leagueSpecific && (
                                  <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                    {leagueSpecific} Only
                                  </span>
                                )}
                              </label>
                              <div className="relative">
                                <select
                                  value={awardsPredictions[category] || ''}
                                  onChange={(e) => handleAwardsPredictionChange(category, e.target.value)}
                                  className="input-field"
                                  required
                                >
                                  <option value="">Select player...</option>
                                  {filteredPlayers.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.name} - {getTeamNameById(player.team)}
                                    </option>
                                  ))}
                                </select>
                                <Star className="h-5 w-5 text-yellow-500 absolute right-3 top-1/2 -translate-y-1/2" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
                    Awards predictions are currently closed for the {sport} {new Date().getFullYear()} season.
                    Please check back later for the next season.
                  </div>
                )}
              </>
            )}

            {type === 'standings' && season && (
              <div className="space-y-6">
                {/* Championship Predictions Section */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-6">Championship Predictions</h3>
                  
                  {/* Conference Winners */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {Object.entries(getChampionshipLabels(sport).conferences).map(([conference, label]) => (
                      <div key={conference}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {label}
                        </label>
                        <select
                          value={championshipPredictions.conferenceWinners[conference] || ''}
                          onChange={(e) => handleConferenceWinnerChange(conference, e.target.value)}
                          className="input-field w-full"
                          required
                        >
                          <option value="">Select team...</option>
                          {getConferenceTeams(conference).map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Championship Winner */}
                  {Object.keys(championshipPredictions.conferenceWinners).length === 
                    Object.keys(getChampionshipLabels(sport).conferences).length && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {getChampionshipLabels(sport).championship}
                      </label>
                      <select
                        value={championshipPredictions.championshipWinner}
                        onChange={(e) => handleChampionshipWinnerChange(e.target.value)}
                        className="input-field w-full"
                        required
                      >
                        <option value="">Select winner...</option>
                        {Object.entries(championshipPredictions.conferenceWinners).map(([conference, teamId]) => {
                          const team = getConferenceTeams(conference).find(t => t.id === teamId);
                          return team ? (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ) : null;
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {((type === 'general') || 
              (type === 'standings' && !existingPrediction && !loading) || 
              (type === 'awards' && !existingAwardsPrediction && !loading)) && (
              <div className="pt-4 border-t border-gray-700">
                <button
                  type="submit"
                  className="w-full btn-primary py-3 text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Prediction'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
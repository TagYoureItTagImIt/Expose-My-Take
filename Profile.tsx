import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Activity, ThumbsUp, ThumbsDown, Filter, List, Users } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';

interface UserProfile {
  username: string;
  points: number;
  createdAt: string;
}

interface UserPrediction {
  id: string;
  sport: string;
  predictionText: string;
  endDate: string;
  status: string;
  upvotedBy?: string[];
  downvotedBy?: string[];
}

type VoteFilter = 'all' | 'upvoted' | 'downvoted';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [votedPredictions, setVotedPredictions] = useState<UserPrediction[]>([]);
  const [voteFilter, setVoteFilter] = useState<VoteFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;

      try {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          console.log('User document does not exist');
        }

        // Fetch user's predictions
        const predictionsQuery = query(
          collection(db, 'predictions'),
          where('userId', '==', userId)
        );
        const predictionsSnapshot = await getDocs(predictionsQuery);
        const predictionsData = predictionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserPrediction[];

        setPredictions(predictionsData);

        // Fetch predictions that the user has voted on
        const allPredictionsQuery = query(collection(db, 'predictions'));
        const allPredictionsSnapshot = await getDocs(allPredictionsQuery);
        const votedPreds = allPredictionsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as UserPrediction))
          .filter(pred => 
            pred.upvotedBy?.includes(userId) || 
            pred.downvotedBy?.includes(userId)
          );

        setVotedPredictions(votedPreds);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-400">User not found</h2>
      </div>
    );
  }

  const correctPredictions = predictions.filter(p => p.status === 'correct').length;
  const accuracy = predictions.length > 0 
    ? Math.round((correctPredictions / predictions.length) * 100) 
    : 0;

  const filteredVotedPredictions = votedPredictions.filter(prediction => {
    if (voteFilter === 'all') return true;
    if (voteFilter === 'upvoted') return prediction.upvotedBy?.includes(userId || '');
    if (voteFilter === 'downvoted') return prediction.downvotedBy?.includes(userId || '');
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 rounded-full p-3">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              <p className="text-gray-400">
                Member since {format(new Date(profile.createdAt), 'MMMM yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/groups')}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              <Users className="h-4 w-4" />
              <span>My Groups</span>
            </button>
            
            <button
              onClick={() => navigate('/predictions')}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <List className="h-4 w-4" />
              <span>View All Predictions</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{profile.points}</div>
            <div className="text-gray-400">Points</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{correctPredictions}</div>
            <div className="text-gray-400">Correct Predictions</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{accuracy}%</div>
            <div className="text-gray-400">Accuracy</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-lg font-semibold">
              <Activity className="h-5 w-5" />
              <h2>Recent Activity</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {predictions.map(prediction => (
              <div key={prediction.id} className={`sport-card ${prediction.sport} p-6`}>
                <span className={`inline-block px-2 py-1 rounded bg-${prediction.sport.toLowerCase()}-500/20 
                                text-${prediction.sport.toLowerCase()}-300 text-sm font-semibold mb-2`}>
                  {prediction.sport}
                </span>
                <h3 className="text-xl font-bold mb-2">{prediction.predictionText}</h3>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Status: {prediction.status}</span>
                  <span>Ends {format(new Date(prediction.endDate), 'MMM yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-lg font-semibold">
            <Filter className="h-5 w-5" />
            <h2>Voted Predictions</h2>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setVoteFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                voteFilter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setVoteFilter('upvoted')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                voteFilter === 'upvoted' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Upvoted</span>
            </button>
            <button
              onClick={() => setVoteFilter('downvoted')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                voteFilter === 'downvoted' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>Downvoted</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredVotedPredictions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No {voteFilter === 'all' ? 'voted' : voteFilter} predictions found
            </div>
          ) : (
            filteredVotedPredictions.map(prediction => (
              <div key={prediction.id} className={`sport-card ${prediction.sport} p-6`}>
                <span className={`inline-block px-2 py-1 rounded bg-${prediction.sport.toLowerCase()}-500/20 
                                text-${prediction.sport.toLowerCase()}-300 text-sm font-semibold mb-2`}>
                  {prediction.sport}
                </span>
                <h3 className="text-xl font-bold mb-2">{prediction.predictionText}</h3>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Status: {prediction.status}</span>
                  <span>Ends {format(new Date(prediction.endDate), 'MMM yyyy')}</span>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {prediction.upvotedBy?.includes(userId || '') && (
                    <span className="text-green-400">You upvoted this</span>
                  )}
                  {prediction.downvotedBy?.includes(userId || '') && (
                    <span className="text-red-400">You downvoted this</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
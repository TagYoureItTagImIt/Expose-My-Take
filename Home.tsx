import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Clock, Users, Building, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, orderBy, getDocs, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'active' | 'completed' | 'trending';
type Prediction = {
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
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole, user } = useAuth();
  const currentUserId = user?.uid;

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const predictionsRef = collection(db, 'predictions');
        let q;

        switch (activeTab) {
          case 'active':
            q = query(
              predictionsRef,
              where('status', '==', 'pending'),
              orderBy('createdAt', 'desc')
            );
            break;
          case 'completed':
            q = query(
              predictionsRef,
              where('status', '!=', 'pending'),
              orderBy('createdAt', 'desc')
            );
            break;
          case 'trending':
            q = query(
              predictionsRef,
              where('status', '==', 'pending'),
              orderBy('upvotes', 'desc')
            );
            break;
          default:
            q = query(predictionsRef, orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        const predictionData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Prediction[];

        setPredictions(predictionData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [activeTab]);

  const handleDelete = async (predictionId: string) => {
    if (!confirm('Are you sure you want to delete this prediction?')) return;
    
    try {
      await deleteDoc(doc(db, 'predictions', predictionId));
      setPredictions(prev => prev.filter(p => p.id !== predictionId));
    } catch (error) {
      console.error('Error deleting prediction:', error);
    }
  };

  const handleVote = async (predictionId: string, isUpvote: boolean) => {
    const prediction = predictions.find(p => p.id === predictionId);
    if (!prediction) return;

    const updatedPrediction = { ...prediction };

    if (isUpvote) {
      if (updatedPrediction.upvotedBy.includes(currentUserId)) {
        updatedPrediction.upvotes -= 1;
        updatedPrediction.upvotedBy = updatedPrediction.upvotedBy.filter(id => id !== currentUserId);
      } else {
        updatedPrediction.upvotes += 1;
        updatedPrediction.upvotedBy.push(currentUserId);
        if (updatedPrediction.downvotedBy.includes(currentUserId)) {
          updatedPrediction.downvotes -= 1;
          updatedPrediction.downvotedBy = updatedPrediction.downvotedBy.filter(id => id !== currentUserId);
        }
      }
    } else {
      if (updatedPrediction.downvotedBy.includes(currentUserId)) {
        updatedPrediction.downvotes -= 1;
        updatedPrediction.downvotedBy = updatedPrediction.downvotedBy.filter(id => id !== currentUserId);
      } else {
        updatedPrediction.downvotes += 1;
        updatedPrediction.downvotedBy.push(currentUserId);
        if (updatedPrediction.upvotedBy.includes(currentUserId)) {
          updatedPrediction.upvotes -= 1;
          updatedPrediction.upvotedBy = updatedPrediction.upvotedBy.filter(id => id !== currentUserId);
        }
      }
    }

    try {
      await updateDoc(doc(db, 'predictions', predictionId), {
        upvotes: updatedPrediction.upvotes,
        downvotes: updatedPrediction.downvotes,
        upvotedBy: updatedPrediction.upvotedBy,
        downvotedBy: updatedPrediction.downvotedBy,
      });

      setPredictions(prev => prev.map(p => (p.id === predictionId ? updatedPrediction : p)));
    } catch (error) {
      console.error('Error updating vote:', error);
    }
  };

  const handleVerifyPrediction = async (predictionId: string, isCorrect: boolean) => {
    try {
      await updateDoc(doc(db, 'predictions', predictionId), {
        status: isCorrect ? 'correct' : 'incorrect',
        verifiedAt: new Date().toISOString()
      });
      
      setPredictions(prev => prev.map(p => 
        p.id === predictionId 
          ? { ...p, status: isCorrect ? 'correct' : 'incorrect' }
          : p
      ));
    } catch (error) {
      console.error('Error verifying prediction:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sports Predictions</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`btn-secondary flex items-center space-x-2 ${
              activeTab === 'active' ? 'bg-blue-600 hover:bg-blue-700' : ''
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Active</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`btn-secondary flex items-center space-x-2 ${
              activeTab === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Completed</span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`btn-secondary flex items-center space-x-2 ${
              activeTab === 'trending' ? 'bg-orange-600 hover:bg-orange-700' : ''
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Trending</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No predictions found
          </div>
        ) : (
          predictions.map((prediction) => (
            <div key={prediction.id} className={`sport-card ${prediction.sport} p-6`}>
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-block px-2 py-1 rounded bg-${prediction.sport.toLowerCase()}-500/20 
                                    text-${prediction.sport.toLowerCase()}-300 text-sm font-semibold`}>
                      {prediction.sport}
                    </span>
                    <Link 
                      to={`/profile/${prediction.userId}`}
                      className="text-sm text-gray-400 hover:text-gray-300"
                    >
                      by {prediction.username}
                    </Link>
                  </div>
                  <h3 className="text-xl font-bold">{prediction.predictionText}</h3>
                  {(prediction.team || prediction.player) && (
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
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
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-2 mb-2">
                    {prediction.userId !== currentUserId && (
                      <>
                        <button 
                          onClick={() => handleVote(prediction.id, true)} 
                          className={`p-2 rounded hover:bg-gray-700 ${prediction.upvotedBy.includes(currentUserId) ? 'text-yellow-500 bg-yellow-200' : ''}`}
                        >
                          ▲
                        </button>
                        </>
                    )}
                    <span>{prediction.upvotes - prediction.downvotes || 0}</span>
                    {prediction.userId !== currentUserId && (
                      <>
                        <button 
                          onClick={() => handleVote(prediction.id, false)} 
                          className={`p-2 rounded hover:bg-gray-700 ${prediction.downvotedBy.includes(currentUserId) ? 'text-yellow-500 bg-yellow-200' : ''}`}
                        >
                          ▼
                        </button>
                      </>
                    )}
                    {userRole === 'moderator' && (
                      <>
                        <button
                          onClick={() => handleDelete(prediction.id)}
                          className="p-2 rounded hover:bg-red-600/20 text-red-400 hover:text-red-300"
                          title="Delete prediction"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        {prediction.status === 'pending' && 
                         new Date(prediction.endDate) <= new Date() && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleVerifyPrediction(prediction.id, true)}
                              className="p-2 rounded hover:bg-green-600/20 text-green-400 hover:text-green-300"
                              title="Mark as correct"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleVerifyPrediction(prediction.id, false)}
                              className="p-2 rounded hover:bg-red-600/20 text-red-400 hover:text-red-300"
                              title="Mark as incorrect"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">
                    Ends {format(new Date(prediction.endDate), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
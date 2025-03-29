import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Copy, UserMinus, Settings, X } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  username: string;
  // add other user fields as needed
}

interface Group {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  creatorName: string;
  members: string[];
  memberNames: string[];
  createdAt: Date;
}

const Groups: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch user's groups
  useEffect(() => {
    if (!user) return;

    const fetchGroups = async () => {
      setLoading(true);
      try {
        // Get groups where user is a member
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('members', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);
        
        const groupsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // Fetch member names
          const memberNames = await Promise.all(data.members.map(async (memberId: string) => {
            const userDocRef = doc(db, 'users', memberId);
            const userDocSnapshot = await getDoc(userDocRef);
            const userData = userDocSnapshot.data() as UserData;
            return userData?.username || 'Unknown User';
          }));
          
          return {
            id: docSnapshot.id,
            name: data.name,
            code: data.code,
            createdBy: data.createdBy,
            creatorName: data.creatorName,
            members: data.members,
            memberNames,
            createdAt: data.createdAt.toDate()
          } as Group;
        }));
        
        setMyGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  // Generate a random 6-character code
  const generateGroupCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Add this helper function near the top of the component
  const getGroupErrorMessage = (error: any): string => {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    
    // Common Firestore errors
    if (errorCode.includes('permission-denied')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    if (errorCode.includes('not-found')) {
      return 'The group you\'re looking for doesn\'t exist or has been deleted.';
    }
    
    if (errorCode.includes('already-exists')) {
      return 'A group with this information already exists.';
    }
    
    if (errorMessage.includes('quota')) {
      return 'We\'re experiencing high demand. Please try again later.';
    }
    
    if (errorCode.includes('unavailable') || errorCode.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Group-specific errors
    if (errorMessage.includes('code')) {
      return 'Invalid group code. Please check and try again.';
    }
    
    if (errorMessage.includes('member')) {
      return 'You\'re already a member of this group.';
    }
    
    // Generic fallback
    return 'An error occurred. Please try again or contact support if the problem persists.';
  };

  // Create a new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get user's username
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnapshot = await getDoc(userDocRef);
      const username = userDocSnapshot.data()?.username;
      
      // Create group with random code
      const groupCode = generateGroupCode();
      
      const newGroup = {
        name: groupName.trim(),
        code: groupCode,
        createdBy: user.uid,
        creatorName: username,
        members: [user.uid],
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'groups'), newGroup);
      
      setSuccess('Group created successfully!');
      setGroupName('');
      setShowCreateModal(false);
      
      // Refresh groups
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('members', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      
      const groupsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Fetch member names
        const memberNames = await Promise.all(data.members.map(async (memberId: string) => {
          const userDocRef = doc(db, 'users', memberId);
          const userDocSnapshot = await getDoc(userDocRef);
          const userData = userDocSnapshot.data() as UserData;
          return userData?.username || 'Unknown User';
        }));
        
        return {
          id: docSnapshot.id,
          name: data.name,
          code: data.code,
          createdBy: data.createdBy,
          creatorName: data.creatorName,
          members: data.members,
          memberNames,
          createdAt: data.createdAt.toDate()
        } as Group;
      }));
      
      setMyGroups(groupsData);
    } catch (error) {
      console.error('Error creating group:', error);
      setError(getGroupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Join a group with code
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!joinCode.trim()) {
      setError('Please enter a group code');
      return;
    }
    
    try {
      setLoading(true);
      
      // Find group with code
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('code', '==', joinCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Invalid group code. Please check and try again.');
        return;
      }
      
      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();
      
      // Check if user is already a member
      if (groupData.members.includes(user.uid)) {
        setError('You are already a member of this group.');
        return;
      }
      
      // Add user to group
      await updateDoc(doc(db, 'groups', groupDoc.id), {
        members: arrayUnion(user.uid)
      });
      
      setSuccess('Successfully joined the group!');
      setJoinCode('');
      setShowJoinModal(false);
      
      // Refresh groups
      const updatedGroupsRef = collection(db, 'groups');
      const updatedQ = query(updatedGroupsRef, where('members', 'array-contains', user.uid));
      const updatedQuerySnapshot = await getDocs(updatedQ);
      
      const groupsData = await Promise.all(updatedQuerySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Fetch member names
        const memberNames = await Promise.all(data.members.map(async (memberId: string) => {
          const userDocRef = doc(db, 'users', memberId);
          const userDocSnapshot = await getDoc(userDocRef);
          const userData = userDocSnapshot.data() as UserData;
          return userData?.username || 'Unknown User';
        }));
        
        return {
          id: docSnapshot.id,
          name: data.name,
          code: data.code,
          createdBy: data.createdBy,
          creatorName: data.creatorName,
          members: data.members,
          memberNames,
          createdAt: data.createdAt.toDate()
        } as Group;
      }));
      
      setMyGroups(groupsData);
    } catch (error) {
      console.error('Error joining group:', error);
      setError(getGroupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Leave a group
  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get group data
      const groupDocRef = doc(db, 'groups', groupId);
      const groupDocSnapshot = await getDoc(groupDocRef);
      const groupData = groupDocSnapshot.data();
      
      // If user is the creator, delete the group
      if (groupData?.createdBy === user.uid) {
        await deleteDoc(doc(db, 'groups', groupId));
      } else {
        // Otherwise, remove user from members
        await updateDoc(doc(db, 'groups', groupId), {
          members: arrayRemove(user.uid)
        });
      }
      
      setSuccess('You have left the group.');
      
      // Update groups list
      setMyGroups(myGroups.filter(group => group.id !== groupId));
      setShowManageModal(false);
    } catch (error) {
      console.error('Error leaving group:', error);
      setError(getGroupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Kick a member from group
  const handleKickMember = async (groupId: string, memberId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Remove member from group
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(memberId)
      });
      
      setSuccess('Member removed from group.');
      
      // Update selected group
      if (selectedGroup && selectedGroup.id === groupId) {
        const updatedMembers = selectedGroup.members.filter(id => id !== memberId);
        const updatedMemberNames = selectedGroup.memberNames.filter((_, index) => 
          selectedGroup.members[index] !== memberId
        );
        
        setSelectedGroup({
          ...selectedGroup,
          members: updatedMembers,
          memberNames: updatedMemberNames
        });
      }
      
      // Refresh groups
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('members', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      
      const groupsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Fetch member names
        const memberNames = await Promise.all(data.members.map(async (memberId: string) => {
          const userDocRef = doc(db, 'users', memberId);
          const userDocSnapshot = await getDoc(userDocRef);
          const userData = userDocSnapshot.data() as UserData;
          return userData?.username || 'Unknown User';
        }));
        
        return {
          id: docSnapshot.id,
          name: data.name,
          code: data.code,
          createdBy: data.createdBy,
          creatorName: data.creatorName,
          members: data.members,
          memberNames,
          createdAt: data.createdAt.toDate()
        } as Group;
      }));
      
      setMyGroups(groupsData);
    } catch (error) {
      console.error('Error kicking member:', error);
      setError(getGroupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Copy group code to clipboard
  const copyGroupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Users className="mr-3 h-8 w-8 text-blue-500" />
          My Groups
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary flex items-center"
          >
            <Search className="mr-2 h-4 w-4" />
            Join Group
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-900/20 border border-green-800 text-green-300 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Groups List */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : myGroups.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 rounded-lg border border-gray-700">
          <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Groups Yet</h2>
          <p className="text-gray-400 mb-6">You haven't joined any groups yet. Create a new group or join an existing one.</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary"
            >
              Join Group
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myGroups.map(group => (
            <div key={group.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-5">
                <h2 className="text-xl font-bold mb-2">{group.name}</h2>
                <div className="flex items-center text-sm text-gray-400 mb-4">
                  <span>Created by {group.creatorName}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-400 mb-4">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{group.members.length} {group.members.length === 1 ? 'Member' : 'Members'}</span>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedGroup(group);
                    setShowManageModal(true);
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg flex items-center justify-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Group
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Group</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setGroupName('');
                  setError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter group name"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Join a Group</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleJoinGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Group Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input-field w-full"
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  required
                />
              </div>
              
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Group Modal */}
      {showManageModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedGroup.name}</h2>
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedGroup(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Group Code</h3>
                <button
                  onClick={() => copyGroupCode(selectedGroup.code)}
                  className="text-blue-500 hover:text-blue-400 flex items-center"
                >
                  {copied ? 'Copied!' : 'Copy'}
                  <Copy className="h-4 w-4 ml-1" />
                </button>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg font-mono text-center">
                {selectedGroup.code}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Share this code with others to invite them to your group.
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Members ({selectedGroup.members.length})</h3>
              <div className="space-y-2">
                {selectedGroup.members.map((memberId, index) => (
                  <div key={memberId} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                        {selectedGroup.memberNames[index].charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{selectedGroup.memberNames[index]}</p>
                        {memberId === selectedGroup.createdBy && (
                          <span className="text-xs text-blue-400">Group Creator</span>
                        )}
                      </div>
                    </div>
                    
                    {user?.uid === selectedGroup.createdBy && memberId !== user.uid && (
                      <button
                        onClick={() => handleKickMember(selectedGroup.id, memberId)}
                        className="text-red-500 hover:text-red-400"
                        title="Remove member"
                      >
                        <UserMinus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={() => handleLeaveGroup(selectedGroup.id)}
                className="w-full py-2 text-red-500 hover:text-red-400 font-medium"
              >
                {user?.uid === selectedGroup.createdBy ? 'Delete Group' : 'Leave Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups; 
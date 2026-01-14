import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Users, Shield, Eye, Edit, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserManagement() {
  const { userProfile, createUserAsAdmin, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'viewer',
    department: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      console.log('Loading users from Firestore...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log('Found', usersSnapshot.docs.length, 'users');
      const usersData = usersSnapshot.docs.map(doc => {
        console.log('User:', doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        };
      });
      setUsers(usersData);
      console.log('Users state updated:', usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreating(true);
    
    try {
      await createUserAsAdmin(
        newUser.email,
        newUser.displayName,
        newUser.role,
        newUser.department
      );
      
      alert(`User created! A password reset email has been sent to ${newUser.email}`);
      
      // Reset form and close modal
      setNewUser({
        email: '',
        displayName: '',
        role: 'viewer',
        department: ''
      });
      setShowAddUser(false);
      
      // Reload users list
      await loadUsers();
      
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered.');
      } else {
        alert(`Failed to create user: ${error.message}`);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleCancelAddUser() {
    // Reset form
    setNewUser({
      email: '',
      displayName: '',
      role: 'viewer',
      department: ''
    });
    // Close modal
    setShowAddUser(false);
  }

  async function updateUserRole(userId, newRole) {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      await loadUsers();
      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    } finally {
      setUpdating(null);
    }
  }

  async function deleteUser(userId, userName) {
    // Prevent deleting yourself
    if (userId === currentUser?.uid) {
      alert("You cannot delete your own account!");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(userId);
    try {
      // Delete from Firestore (note: this doesn't delete from Firebase Auth)
      await deleteDoc(doc(db, 'users', userId));
      await loadUsers();
      alert('User deleted successfully. Note: They can still login if they remember their password, but will have no permissions.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleting(null);
    }
  }

  if (userProfile?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center py-12">
          <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            Manage user roles and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5 mr-2 inline" />
          Add User
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
              <button onClick={handleCancelAddUser} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input-field"
                  placeholder="john.doe@chrintegrated.com"
                />
              </div>

              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="input-field"
                  placeholder="IT, Sales, Finance, etc."
                />
              </div>

              <div>
                <label className="label">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="input-field"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  A password reset email will be sent to the user. They'll set their own password on first login.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelAddUser}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {user.department || 'Not set'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'editor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user.role === 'editor' && <Edit className="w-3 h-3 mr-1" />}
                      {user.role === 'viewer' && <Eye className="w-3 h-3 mr-1" />}
                      {user.role || 'viewer'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {updating === user.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                    ) : (
                      <select
                        value={user.role || 'viewer'}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="input-field py-1 text-sm"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.id === currentUser?.uid ? (
                      <span className="text-gray-400 text-xs italic">Cannot delete yourself</span>
                    ) : deleting === user.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                    ) : (
                      <button
                        onClick={() => deleteUser(user.id, user.displayName)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-2 mb-3">
            <Eye className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Viewer</h3>
          </div>
          <p className="text-sm text-gray-600">
            Can view all contracts, use AI assessment and comparison tools, but cannot create, edit, or delete contracts.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-3">
            <Edit className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Editor</h3>
          </div>
          <p className="text-sm text-gray-600">
            Can create, edit, and delete contracts. Can use all AI features and manage contract lifecycle.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-3">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Admin</h3>
          </div>
          <p className="text-sm text-gray-600">
            Full access including user management. Can assign roles and manage all aspects of the system.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { userProfile } = useAuth();

  const permissions = {
    // Viewer permissions
    canView: true, // Everyone can view
    canUseAI: true, // Everyone can use AI features
    
    // Editor permissions
    canCreate: userProfile?.role === 'editor' || userProfile?.role === 'admin',
    canEdit: userProfile?.role === 'editor' || userProfile?.role === 'admin',
    canDelete: userProfile?.role === 'editor' || userProfile?.role === 'admin',
    canSync: userProfile?.role === 'editor' || userProfile?.role === 'admin',
    
    // Admin permissions
    canManageUsers: userProfile?.role === 'admin',
    isAdmin: userProfile?.role === 'admin',
    isEditor: userProfile?.role === 'editor' || userProfile?.role === 'admin',
    isViewer: userProfile?.role === 'viewer'
  };

  return permissions;
}

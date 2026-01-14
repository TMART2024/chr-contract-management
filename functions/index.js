const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Delete user from both Authentication and Firestore
exports.deleteUser = functions.https.onRequest((req, res) => {
  // Handle CORS
  return cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Check authentication from request body
      const { userId, requesterId } = req.body;

      if (!requesterId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      // Check if requester is an admin
      const requesterDoc = await admin.firestore()
        .collection('users')
        .doc(requesterId)
        .get();

      if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied: Only admins can delete users' });
      }

      // Prevent deleting yourself
      if (userId === requesterId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Delete from Firebase Authentication
      await admin.auth().deleteUser(userId);

      // Delete from Firestore
      await admin.firestore().collection('users').doc(userId).delete();

      return res.status(200).json({ 
        data: { success: true, message: 'User deleted successfully' }
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ 
        error: 'Failed to delete user: ' + error.message 
      });
    }
  });
});

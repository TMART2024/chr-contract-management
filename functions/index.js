const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Delete user from both Authentication and Firestore
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if requester is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users.'
    );
  }

  // Check if requester is an admin
  const requesterDoc = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get();

  if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete users.'
    );
  }

  const { userId } = data;

  // Prevent deleting yourself
  if (userId === context.auth.uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Cannot delete your own account.'
    );
  }

  try {
    // Delete from Firebase Authentication
    await admin.auth().deleteUser(userId);

    // Delete from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete user: ' + error.message
    );
  }
});

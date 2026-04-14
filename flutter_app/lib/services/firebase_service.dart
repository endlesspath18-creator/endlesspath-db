import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:endless_path/models/user_profile.dart';
import 'package:endless_path/models/service.dart';

class FirebaseService with ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  User? _user;
  UserProfile? _profile;
  bool _loading = true;

  User? get user => _user;
  UserProfile? get profile => _profile;
  bool get loading => _loading;

  FirebaseService() {
    _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  Future<void> _onAuthStateChanged(User? firebaseUser) async {
    _user = firebaseUser;
    if (firebaseUser != null) {
      await _fetchProfile(firebaseUser.uid);
    } else {
      _profile = null;
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> _fetchProfile(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    if (doc.exists) {
      _profile = UserProfile.fromFirestore(doc);
    } else {
      // Create new profile if it doesn't exist
      final newProfile = UserProfile(
        uid: uid,
        name: _user?.displayName,
        email: _user?.email,
        role: 'user',
        photoURL: _user?.photoURL,
        createdAt: DateTime.now(),
      );
      await _db.collection('users').doc(uid).set(newProfile.toMap());
      _profile = newProfile;
    }
    notifyListeners();
  }

  Future<void> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return;

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final AuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      await _auth.signInWithCredential(credential);
    } catch (e) {
      print("Error signing in with Google: $e");
      rethrow;
    }
  }

  Future<void> signInWithEmail(String email, String password) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      print("Error signing in with Email: $e");
      rethrow;
    }
  }

  Future<void> signUpWithEmail(String email, String password) async {
    try {
      await _auth.createUserWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      print("Error signing up with Email: $e");
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }

  Stream<List<Service>> getServices() {
    return _db.collection('services').orderBy('createdAt', descending: true).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => Service.fromFirestore(doc)).toList();
    });
  }

  Future<void> createService(Service service) async {
    await _db.collection('services').add(service.toMap());
  }
}

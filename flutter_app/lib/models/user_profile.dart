import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String uid;
  final String? name;
  final String? email;
  final String? phone;
  final String role;
  final String? photoURL;
  final DateTime createdAt;
  final bool isPremium;
  final DateTime? premiumUntil;
  final String? upiId;

  UserProfile({
    required this.uid,
    this.name,
    this.email,
    this.phone,
    required this.role,
    this.photoURL,
    required this.createdAt,
    this.isPremium = false,
    this.premiumUntil,
    this.upiId,
  });

  factory UserProfile.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map;
    return UserProfile(
      uid: doc.id,
      name: data['name'],
      email: data['email'],
      phone: data['phone'],
      role: data['role'] ?? 'user',
      photoURL: data['photoURL'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      isPremium: data['isPremium'] ?? false,
      premiumUntil: data['premiumUntil'] != null 
          ? (data['premiumUntil'] as Timestamp).toDate() 
          : null,
      upiId: data['upiId'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'photoURL': photoURL,
      'createdAt': createdAt,
      'isPremium': isPremium,
      'premiumUntil': premiumUntil,
      'upiId': upiId,
    };
  }
}

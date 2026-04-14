import 'package:cloud_firestore/cloud_firestore.dart';

class Service {
  final String id;
  final String name;
  final String category;
  final String? description;
  final double price;
  final String providerId;
  final String? providerName;
  final DateTime createdAt;

  Service({
    required this.id,
    required this.name,
    required this.category,
    this.description,
    required this.price,
    required this.providerId,
    this.providerName,
    required this.createdAt,
  });

  factory Service.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map;
    return Service(
      id: doc.id,
      name: data['name'] ?? '',
      category: data['category'] ?? '',
      description: data['description'],
      price: (data['price'] ?? 0).toDouble(),
      providerId: data['providerId'] ?? '',
      providerName: data['providerName'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'category': category,
      'description': description,
      'price': price,
      'providerId': providerId,
      'providerName': providerName,
      'createdAt': createdAt,
    };
  }
}

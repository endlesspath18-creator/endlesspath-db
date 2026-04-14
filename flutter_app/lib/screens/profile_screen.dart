import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:endless_path/services/firebase_service.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);
    final profile = firebaseService.profile;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F4),
      appBar: AppBar(
        title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Profile Header
          Center(
            child: Column(
              children: [
                Stack(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFEF4444), width: 2),
                      ),
                      child: CircleAvatar(
                        radius: 50,
                        backgroundImage: profile?.photoURL != null 
                            ? CachedNetworkImageProvider(profile!.photoURL!) 
                            : null,
                        child: profile?.photoURL == null ? const Icon(LucideIcons.user, size: 40) : null,
                      ),
                    ),
                    if (profile?.isPremium ?? false)
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                          child: const Icon(LucideIcons.crown, color: Colors.white, size: 16),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(profile?.name ?? 'Guest User', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                Text(profile?.email ?? '', style: TextStyle(color: Colors.grey[600])),
              ],
            ),
          ).animate().fadeIn().scale(),
          
          const SizedBox(height: 40),
          
          // Premium Card
          if (profile?.role == 'user')
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: profile?.isPremium ?? false ? const Color(0xFFEF4444) : Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 10)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        profile?.isPremium ?? false ? 'PRO MEMBERSHIP' : 'UPGRADE TO PRO',
                        style: TextStyle(
                          color: profile?.isPremium ?? false ? Colors.white : const Color(0xFFEF4444),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Icon(LucideIcons.crown, color: profile?.isPremium ?? false ? Colors.white : const Color(0xFFEF4444)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    profile?.isPremium ?? false ? 'Enjoy 10% off on all bookings' : 'Unlock exclusive discounts',
                    style: TextStyle(
                      color: profile?.isPremium ?? false ? Colors.white.withOpacity(0.9) : Colors.grey[600],
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ).animate().slideY(begin: 0.2),
            
          const SizedBox(height: 32),
          
          // Menu Items
          _buildMenuItem(LucideIcons.settings, 'Account Settings'),
          _buildMenuItem(LucideIcons.creditCard, 'Payment Methods'),
          _buildMenuItem(LucideIcons.helpCircle, 'Help & Support'),
          const Divider(height: 40),
          _buildMenuItem(LucideIcons.logOut, 'Sign Out', color: const Color(0xFFEF4444), onTap: () => firebaseService.signOut()),
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, {Color? color, VoidCallback? onTap}) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: color ?? const Color(0xFF1C1917)),
      title: Text(title, style: TextStyle(color: color ?? const Color(0xFF1C1917), fontWeight: FontWeight.w600)),
      trailing: const Icon(LucideIcons.chevronRight, size: 16),
      contentPadding: EdgeInsets.zero,
    );
  }
}

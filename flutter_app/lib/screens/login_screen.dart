import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:endless_path/services/firebase_service.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F4),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const Icon(
                  LucideIcons.sparkles,
                  size: 64,
                  color: Color(0xFFEF4444),
                ),
              ).animate().scale(duration: 600.ms, curve: Curves.backOut),
              const SizedBox(height: 32),
              Text(
                'Endless Path',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.5,
                  color: const Color(0xFF1C1917),
                ),
              ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
              const SizedBox(height: 12),
              Text(
                'Professional services, delivered with excellence.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                  height: 1.5,
                ),
              ).animate().fadeIn(delay: 400.ms),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: () => firebaseService.signInWithGoogle(),
                icon: const Icon(LucideIcons.logIn, size: 20),
                label: const Text('Continue with Google'),
              ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.5),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

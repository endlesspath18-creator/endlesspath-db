import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:endless_path/services/firebase_service.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F4),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 64),
              Container(
                padding: const Offset(0, 0) == Offset.zero ? const EdgeInsets.all(24) : EdgeInsets.zero,
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
              const SizedBox(height: 48),
              TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  hintText: 'Email',
                  prefixIcon: const Icon(LucideIcons.mail, size: 20),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  hintText: 'Password',
                  prefixIcon: const Icon(LucideIcons.lock, size: 20),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              if (_isLoading)
                const CircularProgressIndicator(color: Color(0xFFEF4444))
              else ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      setState(() => _isLoading = true);
                      try {
                        await firebaseService.signInWithEmail(
                          _emailController.text,
                          _passwordController.text,
                        );
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Login failed: $e')),
                        );
                      } finally {
                        setState(() => _isLoading = false);
                      }
                    },
                    child: const Text('Login'),
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    setState(() => _isLoading = true);
                    try {
                      await firebaseService.signUpWithEmail(
                        _emailController.text,
                        _passwordController.text,
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Signup failed: $e')),
                      );
                    } finally {
                      setState(() => _isLoading = false);
                    }
                  },
                  child: const Text(
                    'Don\'t have an account? Register Now',
                    style: TextStyle(color: Color(0xFFEF4444)),
                  ),
                ),
              ],
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Divider(),
              ),
              ElevatedButton.icon(
                onPressed: () => firebaseService.signInWithGoogle(),
                icon: const Icon(LucideIcons.logIn, size: 20),
                label: const Text('Continue with Google'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                ),
              ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.5),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

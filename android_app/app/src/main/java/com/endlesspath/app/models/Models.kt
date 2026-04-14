package com.endlesspath.app.models

import com.google.firebase.Timestamp

data class UserProfile(
    val uid: String = "",
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: String = "user",
    val photoURL: String? = null,
    val createdAt: Timestamp = Timestamp.now(),
    val isPremium: Boolean = false,
    val premiumUntil: Timestamp? = null,
    val upiId: String? = null
)

data class Service(
    val id: String = "",
    val name: String = "",
    val category: String = "",
    val description: String? = null,
    val price: Double = 0.0,
    val providerId: String = "",
    val providerName: String? = null,
    val createdAt: Timestamp = Timestamp.now()
)

data class Booking(
    val id: String = "",
    val serviceId: String = "",
    val serviceName: String? = null,
    val userId: String = "",
    val userName: String? = null,
    val providerId: String = "",
    val status: String = "pending",
    val bookingTime: Timestamp = Timestamp.now(),
    val createdAt: Timestamp = Timestamp.now(),
    val totalPrice: Double = 0.0,
    val paymentStatus: String = "pending"
)

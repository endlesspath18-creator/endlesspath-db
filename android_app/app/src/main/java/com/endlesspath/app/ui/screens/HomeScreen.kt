package com.endlesspath.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.endlesspath.app.models.Service
import com.google.firebase.firestore.FirebaseFirestore

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onNavigateToProfile: () -> Unit) {
    var services by remember { mutableStateOf(listOf<Service>()) }
    val db = FirebaseFirestore.instance

    LaunchedEffect(Unit) {
        db.collection("services").addSnapshotListener { snapshot, _ ->
            services = snapshot?.toObjects(Service::class.java) ?: listOf()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Welcome back,", fontSize = 12.sp, color = Color.Gray)
                        Text("Guest", fontSize = 18.sp, fontWeight = FontWeight.Black)
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.Person, contentDescription = "Profile")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
        ) {
            item {
                PremiumBanner()
                Spacer(modifier = Modifier.height(32.dp))
                Text("Available Services", fontSize = 20.sp, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.height(16.dp))
            }
            items(services) { service ->
                ServiceCard(service)
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun PremiumBanner() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(Color(0xFFEF4444), Color(0xFFB91C1C))
                )
            )
            .padding(24.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Star, contentDescription = null, tint = Color.Yellow, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("PRO MEMBERSHIP", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text("Get 10% OFF Every Booking", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("Upgrade for just ₹1/quarter", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp)
        }
    }
}

@Composable
fun ServiceCard(service: Service) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(service.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(service.providerName ?: "Elite Professional", color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
                Text("₹${service.price.toInt()}", color = Color(0xFFEF4444), fontWeight = FontWeight.Black, fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(service.description ?: "", color = Color.Gray, fontSize = 13.sp, maxLines = 2)
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.DateRange, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("30-45 mins", color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { /* Handle booking */ },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text("Book Now", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

package com.endlesspath.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFEF4444),
    secondary = Color(0xFF1C1917),
    tertiary = Color(0xFFB91C1C)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFFEF4444),
    secondary = Color(0xFF1C1917),
    tertiary = Color(0xFFB91C1C),
    background = Color(0xFFF5F5F4),
    surface = Color(0xFFFFFFFF),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF1C1917),
    onSurface = Color(0xFF1C1917),
)

@Composable
fun EndlessPathTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

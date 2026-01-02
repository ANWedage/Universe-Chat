package com.universe.chat

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {
    private val SPLASH_DELAY = 2000L // 2 seconds

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Check if user has completed onboarding
        val prefs = SharedPreferencesHelper.getInstance(this)
        val hasCompletedOnboarding = prefs.getBoolean("onboarding_completed", false)
        val isLoggedIn = prefs.getBoolean("is_logged_in", false)

        Handler(Looper.getMainLooper()).postDelayed({
            val intent = when {
                !hasCompletedOnboarding -> Intent(this, OnboardingActivity::class.java)
                !isLoggedIn -> Intent(this, LoginActivity::class.java)
                else -> Intent(this, MainActivity::class.java)
            }
            startActivity(intent)
            finish()
        }, SPLASH_DELAY)
    }
}

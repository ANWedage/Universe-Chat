package com.universe.chat

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.checkbox.MaterialCheckBox
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textview.MaterialTextView
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private lateinit var usernameInput: TextInputEditText
    private lateinit var passwordInput: TextInputEditText
    private lateinit var rememberMeCheckbox: MaterialCheckBox
    private lateinit var loginButton: MaterialButton
    private lateinit var signupLink: MaterialTextView
    private lateinit var homeButton: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        usernameInput = findViewById(R.id.usernameInput)
        passwordInput = findViewById(R.id.passwordInput)
        rememberMeCheckbox = findViewById(R.id.rememberMeCheckbox)
        loginButton = findViewById(R.id.loginButton)
        signupLink = findViewById(R.id.signupLink)
        homeButton = findViewById(R.id.homeButton)

        loginButton.setOnClickListener {
            handleLogin()
        }

        signupLink.setOnClickListener {
            startActivity(Intent(this, SignupActivity::class.java))
        }

        homeButton.setOnClickListener {
            // Go back to onboarding or just close
            finish()
        }
    }

    private fun handleLogin() {
        val username = usernameInput.text.toString().trim().lowercase()
        val password = passwordInput.text.toString()

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }

        loginButton.isEnabled = false
        loginButton.text = "Logging in..."

        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                
                // Get user's email from username - filter on server side for efficiency
                val response = supabase.from("profiles")
                    .select {
                        filter {
                            eq("username", username)
                        }
                    }
                    
                val userProfile = response.decodeList<Profile>().firstOrNull()

                if (userProfile == null) {
                    runOnUiThread {
                        Toast.makeText(this@LoginActivity, "Invalid username or password", Toast.LENGTH_SHORT).show()
                        loginButton.isEnabled = true
                        loginButton.text = "Sign In"
                    }
                    return@launch
                }

                // Sign in with email and password
                supabase.auth.signInWith(Email) {
                    email = userProfile.email
                    this.password = password
                }

                // Save remember me preference
                val prefs = SharedPreferencesHelper.getInstance(this@LoginActivity)
                prefs.putBoolean("is_logged_in", true)
                prefs.putBoolean("remember_me", rememberMeCheckbox.isChecked)
                prefs.putString("user_id", userProfile.id)

                // Navigate to main activity
                runOnUiThread {
                    val intent = Intent(this@LoginActivity, MainActivity::class.java)
                    startActivity(intent)
                    finish()
                }

            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    val errorMsg = when {
                        e.message?.contains("Invalid login credentials", ignoreCase = true) == true -> "Invalid username or password"
                        e.message?.contains("Email not confirmed", ignoreCase = true) == true -> "Please verify your email"
                        e.message?.contains("timeout", ignoreCase = true) == true -> "Connection timeout. Please try again."
                        else -> "Login failed: ${e.message}"
                    }
                    Toast.makeText(this@LoginActivity, errorMsg, Toast.LENGTH_LONG).show()
                    loginButton.isEnabled = true
                    loginButton.text = "Sign In"
                }
            }
        }
    }
}

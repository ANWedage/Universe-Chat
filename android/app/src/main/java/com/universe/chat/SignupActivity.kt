package com.universe.chat

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.checkbox.MaterialCheckBox
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textview.MaterialTextView
import android.view.View
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

class SignupActivity : AppCompatActivity() {
    private lateinit var fullNameInput: TextInputEditText
    private lateinit var usernameInput: TextInputEditText
    private lateinit var emailInput: TextInputEditText
    private lateinit var passwordInput: TextInputEditText
    private lateinit var retypePasswordInput: TextInputEditText
    private lateinit var rememberMeCheckbox: MaterialCheckBox
    private lateinit var signupButton: MaterialButton
    private lateinit var loginLink: MaterialTextView
    private lateinit var homeButton: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_signup)

        fullNameInput = findViewById(R.id.fullNameInput)
        usernameInput = findViewById(R.id.usernameInput)
        emailInput = findViewById(R.id.emailInput)
        passwordInput = findViewById(R.id.passwordInput)
        retypePasswordInput = findViewById(R.id.retypePasswordInput)
        rememberMeCheckbox = findViewById(R.id.rememberMeCheckbox)
        signupButton = findViewById(R.id.signupButton)
        loginLink = findViewById(R.id.loginLink)
        homeButton = findViewById(R.id.homeButton)

        signupButton.setOnClickListener {
            handleSignup()
        }

        loginLink.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        homeButton.setOnClickListener {
            finish()
        }
    }

    private fun handleSignup() {
        val fullName = fullNameInput.text.toString().trim()
        val username = usernameInput.text.toString().trim().lowercase()
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()
        val retypePassword = retypePasswordInput.text.toString()

        // Validation
        if (fullName.isEmpty() || username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }

        if (!fullName.matches(Regex("^[A-Za-z\\s]+$"))) {
            Toast.makeText(this, "Full name can only contain letters and spaces", Toast.LENGTH_SHORT).show()
            return
        }

        if (password != retypePassword) {
            Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
            return
        }

        if (password.length < 6) {
            Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
            return
        }

        signupButton.isEnabled = false
        signupButton.text = "Creating account..."

        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client

                // Check if username already exists
                val response = supabase.from("profiles")
                    .select()
                    
                val existingUser = response.decodeList<Profile>()
                    .firstOrNull { it.username == username }

                if (existingUser != null) {
                    Toast.makeText(this@SignupActivity, "Username already taken", Toast.LENGTH_SHORT).show()
                    signupButton.isEnabled = true
                    signupButton.text = "Create Account"
                    return@launch
                }

                // Sign up user
                val authResult = supabase.auth.signUpWith(Email) {
                    this.email = email
                    this.password = password
                }

                val userId = supabase.auth.currentUserOrNull()?.id ?: throw Exception("Failed to create user")

                // Create profile
                supabase.from("profiles").insert(
                    mapOf(
                        "id" to userId,
                        "username" to username,
                        "email" to email,
                        "full_name" to fullName,
                        "avatar_url" to null
                    )
                )

                // Save preferences
                val prefs = SharedPreferencesHelper.getInstance(this@SignupActivity)
                prefs.putBoolean("is_logged_in", true)
                prefs.putBoolean("remember_me", rememberMeCheckbox.isChecked)
                prefs.putString("user_id", userId)

                Toast.makeText(this@SignupActivity, "Account created successfully!", Toast.LENGTH_SHORT).show()

                // Navigate to main activity
                val intent = Intent(this@SignupActivity, MainActivity::class.java)
                startActivity(intent)
                finish()

            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@SignupActivity, "Signup failed: ${e.message}", Toast.LENGTH_SHORT).show()
                signupButton.isEnabled = true
                signupButton.text = "Create Account"
            }
        }
    }
}

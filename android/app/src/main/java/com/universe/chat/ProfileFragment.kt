package com.universe.chat

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.imageview.ShapeableImageView
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

class ProfileFragment : Fragment() {
    private lateinit var avatarImage: ShapeableImageView
    private lateinit var fullNameText: TextView
    private lateinit var usernameText: TextView
    private lateinit var emailText: TextView
    private lateinit var logoutButton: MaterialButton

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_profile, container, false)
        
        avatarImage = view.findViewById(R.id.avatarImage)
        fullNameText = view.findViewById(R.id.fullNameText)
        usernameText = view.findViewById(R.id.usernameText)
        emailText = view.findViewById(R.id.emailText)
        logoutButton = view.findViewById(R.id.logoutButton)
        
        loadProfile()
        
        logoutButton.setOnClickListener {
            handleLogout()
        }
        
        return view
    }

    private fun loadProfile() {
        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(requireContext())
                val userId = prefs.getString("user_id", null) ?: return@launch

                val response = supabase.from("profiles")
                    .select()
                    
                val profile = response.decodeList<Profile>()
                    .first { it.id == userId }

                fullNameText.text = profile.full_name
                usernameText.text = "@${profile.username}"
                emailText.text = profile.email
                
                // Show UI elements after data is loaded
                fullNameText.visibility = View.VISIBLE
                usernameText.visibility = View.VISIBLE
                emailText.visibility = View.VISIBLE

            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(requireContext(), "Failed to load profile", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun handleLogout() {
        lifecycleScope.launch {
            try {
                SupabaseClient.client.auth.signOut()
                
                val prefs = SharedPreferencesHelper.getInstance(requireContext())
                prefs.putBoolean("is_logged_in", false)
                prefs.putString("user_id", null)

                val intent = Intent(requireContext(), LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                requireActivity().finish()
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(requireContext(), "Logout failed", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

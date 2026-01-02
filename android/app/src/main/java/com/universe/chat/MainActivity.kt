package com.universe.chat

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var bottomNav: BottomNavigationView
    private var currentUserId: String? = null
    
    // Cache fragments to avoid recreating them
    private val chatsFragment = ChatsFragment()
    private val groupsFragment = GroupsFragment()
    private val profileFragment = ProfileFragment()
    private var activeFragment: Fragment = chatsFragment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Check if logged in
        val prefs = SharedPreferencesHelper.getInstance(this)
        currentUserId = prefs.getString("user_id", null)
        
        if (currentUserId == null) {
            // Not logged in, redirect to login
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        bottomNav = findViewById(R.id.bottomNavigation)
        
        // Set default fragment - add all fragments and show chats
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction().apply {
                add(R.id.fragmentContainer, chatsFragment, "chats")
                add(R.id.fragmentContainer, groupsFragment, "groups")
                add(R.id.fragmentContainer, profileFragment, "profile")
                hide(groupsFragment)
                hide(profileFragment)
                commit()
            }
        }

        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_chats -> {
                    showFragment(chatsFragment)
                    true
                }
                R.id.nav_groups -> {
                    showFragment(groupsFragment)
                    true
                }
                R.id.nav_profile -> {
                    showFragment(profileFragment)
                    true
                }
                else -> false
            }
        }
    }

    private fun showFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .hide(activeFragment)
            .show(fragment)
            .commit()
        activeFragment = fragment
    }
}

package com.universe.chat

import android.os.Bundle
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

class SearchUsersActivity : AppCompatActivity() {
    private lateinit var searchInput: TextInputEditText
    private lateinit var searchButton: MaterialButton
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: UsersAdapter
    private val usersList = mutableListOf<Profile>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_search_users)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Search Users"

        searchInput = findViewById(R.id.searchInput)
        searchButton = findViewById(R.id.searchButton)
        recyclerView = findViewById(R.id.usersRecyclerView)

        setupRecyclerView()
        loadAllUsers()

        searchButton.setOnClickListener {
            searchUsers()
        }
    }

    private fun setupRecyclerView() {
        adapter = UsersAdapter(usersList) { user ->
            // Open chat with this user
            val intent = android.content.Intent(this, ChatActivity::class.java)
            intent.putExtra("user_id", user.id)
            intent.putExtra("username", user.username)
            intent.putExtra("full_name", user.full_name)
            startActivity(intent)
            finish()
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    private fun loadAllUsers() {
        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(this@SearchUsersActivity)
                val currentUserId = prefs.getString("user_id", null)

                val profiles = supabase.from("profiles")
                    .select()
                    .decodeList<Profile>()

                usersList.clear()
                usersList.addAll(profiles.filter { it.id != currentUserId })
                adapter.notifyDataSetChanged()
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@SearchUsersActivity, "Failed to load users", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun searchUsers() {
        val query = searchInput.text.toString().trim().lowercase()
        if (query.isEmpty()) {
            loadAllUsers()
            return
        }

        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(this@SearchUsersActivity)
                val currentUserId = prefs.getString("user_id", null)

                val profiles = supabase.from("profiles")
                    .select()
                    .decodeList<Profile>()

                usersList.clear()
                usersList.addAll(
                    profiles.filter { 
                        it.id != currentUserId && 
                        (it.username.contains(query, ignoreCase = true) || 
                         it.full_name.contains(query, ignoreCase = true))
                    }
                )
                adapter.notifyDataSetChanged()
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@SearchUsersActivity, "Search failed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}

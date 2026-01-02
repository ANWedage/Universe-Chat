package com.universe.chat

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

class ChatsFragment : Fragment() {
    private lateinit var recyclerView: RecyclerView
    private lateinit var fabNewChat: FloatingActionButton
    private lateinit var adapter: ChatsAdapter
    private val chatsList = mutableListOf<ChatItem>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_chats, container, false)
        
        recyclerView = view.findViewById(R.id.chatsRecyclerView)
        fabNewChat = view.findViewById(R.id.fabNewChat)
        
        setupRecyclerView()
        loadChats()
        
        fabNewChat.setOnClickListener {
            startActivity(Intent(requireContext(), SearchUsersActivity::class.java))
        }
        
        return view
    }

    private fun setupRecyclerView() {
        adapter = ChatsAdapter(chatsList) { chat ->
            val intent = Intent(requireContext(), ChatActivity::class.java)
            intent.putExtra("user_id", chat.userId)
            intent.putExtra("username", chat.username)
            intent.putExtra("full_name", chat.fullName)
            startActivity(intent)
        }
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter
    }

    private fun loadChats() {
        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(requireContext())
                val currentUserId = prefs.getString("user_id", null) ?: return@launch

                // Get all messages involving current user
                val messagesResponse = supabase.from("messages")
                    .select()
                    
                val messages = messagesResponse.decodeList<Message>()
                    .filter { it.sender_id == currentUserId || it.receiver_id == currentUserId }

                // Get unique user IDs
                val userIds = messages.map { 
                    if (it.sender_id == currentUserId) it.receiver_id else it.sender_id 
                }.filterNotNull().distinct()

                // Get user profiles
                if (userIds.isNotEmpty()) {
                    val profilesResponse = supabase.from("profiles")
                        .select()
                        
                    val profiles = profilesResponse.decodeList<Profile>()
                        .filter { it.id in userIds }

                    // Build chat items list
                    val newChatItems = profiles.map { profile ->
                        val lastMessage = messages
                            .filter { 
                                (it.sender_id == currentUserId && it.receiver_id == profile.id) ||
                                (it.sender_id == profile.id && it.receiver_id == currentUserId)
                            }
                            .maxByOrNull { it.created_at }
                        
                        ChatItem(
                            userId = profile.id,
                            username = profile.username,
                            fullName = profile.full_name,
                            avatarUrl = profile.avatar_url,
                            lastMessage = lastMessage?.content ?: "",
                            timestamp = lastMessage?.created_at ?: "",
                            unreadCount = 0
                        )
                    }
                    
                    // Update UI once with all items
                    activity?.runOnUiThread {
                        chatsList.clear()
                        chatsList.addAll(newChatItems)
                        adapter.notifyDataSetChanged()
                    }
                } else {
                    // No chats yet - this is normal, not an error
                    activity?.runOnUiThread {
                        chatsList.clear()
                        adapter.notifyDataSetChanged()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                activity?.runOnUiThread {
                    Toast.makeText(requireContext(), "Failed to load chats: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        loadChats()
    }
}

data class ChatItem(
    val userId: String,
    val username: String,
    val fullName: String,
    val avatarUrl: String?,
    val lastMessage: String,
    val timestamp: String,
    val unreadCount: Int
)

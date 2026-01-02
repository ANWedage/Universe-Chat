package com.universe.chat

import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.google.android.material.button.MaterialButton
import com.google.android.material.imageview.ShapeableImageView
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonPrimitive

class GroupChatActivity : AppCompatActivity() {
    
    private lateinit var messagesRecyclerView: RecyclerView
    private lateinit var messageInput: EditText
    private lateinit var sendButton: MaterialButton
    private lateinit var groupSettingsButton: ImageButton
    private lateinit var headerAvatar: ShapeableImageView
    private lateinit var headerName: TextView
    private lateinit var headerMembers: TextView
    private lateinit var emojiButton: ImageButton
    private lateinit var emojiPicker: RecyclerView
    
    private lateinit var messagesAdapter: MessagesAdapter
    private lateinit var emojiAdapter: EmojiAdapter
    private val messages = mutableListOf<Message>()
    private val senderProfiles = mutableMapOf<String, Profile>()
    private var isEmojiPickerVisible = false
    
    private var groupId: String? = null
    private var groupName: String? = null
    private var groupPhoto: String? = null
    private var createdBy: String? = null
    private var currentUserId: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_group_chat)
        
        groupId = intent.getStringExtra("group_id")
        groupName = intent.getStringExtra("group_name")
        groupPhoto = intent.getStringExtra("group_photo")
        createdBy = intent.getStringExtra("created_by")
        
        val prefs = SharedPreferencesHelper.getInstance(this)
        currentUserId = prefs.getString("user_id", null)
        
        if (groupId == null || currentUserId == null) {
            finish()
            return
        }
        
        initializeViews()
        setupRecyclerView()
        setupListeners()
        loadGroupMembers()
        loadMessages()
        setupRealtimeSubscription()
    }
    
    private fun initializeViews() {
        messagesRecyclerView = findViewById(R.id.messagesRecyclerView)
        messageInput = findViewById(R.id.messageInput)
        sendButton = findViewById(R.id.sendButton)
        groupSettingsButton = findViewById(R.id.groupSettingsButton)
        headerAvatar = findViewById(R.id.headerAvatar)
        headerName = findViewById(R.id.headerName)
        headerMembers = findViewById(R.id.headerMembers)
        emojiButton = findViewById(R.id.emojiButton)
        emojiPicker = findViewById(R.id.emojiPicker)
        
        headerName.text = groupName ?: "Group"
        
        if (!groupPhoto.isNullOrEmpty()) {
            headerAvatar.load(groupPhoto) {
                placeholder(R.drawable.ic_avatar_placeholder)
                error(R.drawable.ic_avatar_placeholder)
            }
        }
        
        setupEmojiPicker()
    }
    
    private fun setupRecyclerView() {
        messagesAdapter = MessagesAdapter(messages, currentUserId ?: "", isGroupChat = true, senderProfiles)
        messagesRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@GroupChatActivity)
            adapter = messagesAdapter
        }
    }
    
    private fun setupListeners() {
        sendButton.setOnClickListener {
            sendMessage()
        }
        
        groupSettingsButton.setOnClickListener {
            showGroupSettings()
        }
        
        emojiButton.setOnClickListener {
            toggleEmojiPicker()
        }
    }
    
    private fun loadGroupMembers() {
        lifecycleScope.launch {
            try {
                val members = SupabaseClient.client.from("group_members")
                    .select()
                    .decodeList<GroupMember>()
                    .filter { it.group_id == groupId }
                
                headerMembers.text = "${members.size} members"
                
            } catch (e: Exception) {
                Log.e("GroupChatActivity", "Error loading members", e)
            }
        }
    }
    
    private fun loadMessages() {
        lifecycleScope.launch {
            try {
                val allMessages = withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("messages")
                        .select()
                        .decodeList<Message>()
                        .filter { it.group_id == groupId }
                        .sortedBy { it.created_at }
                }
                
                // Get unique sender IDs
                val senderIds = allMessages.map { it.sender_id }.distinct()
                
                // Load profiles for all senders
                val profiles = withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("profiles")
                        .select()
                        .decodeList<Profile>()
                        .filter { it.id in senderIds }
                }
                
                // Update sender profiles map
                senderProfiles.clear()
                profiles.forEach { profile ->
                    senderProfiles[profile.id] = profile
                }
                
                withContext(Dispatchers.Main) {
                    messages.clear()
                    messages.addAll(allMessages)
                    messagesAdapter.notifyDataSetChanged()
                    
                    if (messages.isNotEmpty()) {
                        messagesRecyclerView.scrollToPosition(messages.size - 1)
                    }
                }
                
            } catch (e: Exception) {
                Log.e("GroupChatActivity", "Error loading messages", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@GroupChatActivity, "Failed to load messages", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun sendMessage() {
        val content = messageInput.text.toString().trim()
        
        if (content.isEmpty()) {
            return
        }
        
        lifecycleScope.launch {
            try {
                val messageJson = buildJsonObject {
                    put("sender_id", currentUserId!!)
                    put("group_id", groupId!!)
                    put("content", content)
                    put("delivered", true)
                }
                
                withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("messages")
                        .insert(messageJson)
                }
                
                withContext(Dispatchers.Main) {
                    messageInput.text?.clear()
                }
                
            } catch (e: Exception) {
                Log.e("GroupChatActivity", "Error sending message: ${e.message}", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@GroupChatActivity, "Failed to send message", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun setupRealtimeSubscription() {
        lifecycleScope.launch {
            try {
                val channel = SupabaseClient.client.channel("group_messages_$groupId")
                
                val messageFlow = channel.postgresChangeFlow<PostgresAction>(schema = "public") {
                    table = "messages"
                }
                
                channel.subscribe()
                
                messageFlow.collect { action ->
                    if (action is PostgresAction.Insert) {
                        val record = action.record
                        val messageGroupId = record["group_id"]?.jsonPrimitive?.content
                        
                        if (messageGroupId == groupId) {
                            val senderId = record["sender_id"]?.jsonPrimitive?.content ?: ""
                            
                            val newMessage = Message(
                                id = record["id"]?.jsonPrimitive?.content ?: "",
                                sender_id = senderId,
                                receiver_id = null,
                                group_id = messageGroupId,
                                content = record["content"]?.jsonPrimitive?.content ?: "",
                                created_at = record["created_at"]?.jsonPrimitive?.content ?: "",
                                read = record["read"]?.jsonPrimitive?.content?.toBoolean() ?: false,
                                delivered = record["delivered"]?.jsonPrimitive?.content?.toBoolean() ?: false
                            )
                            
                            // Load sender profile if not already loaded
                            if (!senderProfiles.containsKey(senderId)) {
                                try {
                                    val profile = withContext(Dispatchers.IO) {
                                        SupabaseClient.client.from("profiles")
                                            .select()
                                            .decodeList<Profile>()
                                            .firstOrNull { it.id == senderId }
                                    }
                                    if (profile != null) {
                                        senderProfiles[senderId] = profile
                                    }
                                } catch (e: Exception) {
                                    Log.e("GroupChatActivity", "Error loading sender profile", e)
                                }
                            }
                            
                            runOnUiThread {
                                if (messages.none { it.id == newMessage.id }) {
                                    messages.add(newMessage)
                                    messagesAdapter.notifyItemInserted(messages.size - 1)
                                    messagesRecyclerView.scrollToPosition(messages.size - 1)
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("GroupChatActivity", "Error setting up realtime", e)
            }
        }
    }
    
    private fun showGroupSettings() {
        val dialog = GroupSettingsDialog(
            context = this,
            lifecycleOwner = this,
            groupId = groupId ?: return,
            groupName = groupName ?: "",
            groupPhoto = groupPhoto,
            createdBy = createdBy ?: "",
            currentUserId = currentUserId ?: "",
            onGroupUpdated = { name, photo ->
                groupName = name
                groupPhoto = photo
                headerName.text = name
                if (!photo.isNullOrEmpty()) {
                    headerAvatar.load(photo) {
                        placeholder(R.drawable.ic_avatar_placeholder)
                        error(R.drawable.ic_avatar_placeholder)
                    }
                }
                loadGroupMembers()
            },
            onGroupLeft = {
                finish()
            }
        )
        dialog.show()
    }
    
    private fun setupEmojiPicker() {
        emojiAdapter = EmojiAdapter(EmojiAdapter.EMOJIS) { emoji ->
            val cursorPosition = messageInput.selectionStart
            val currentText = messageInput.text.toString()
            val newText = currentText.substring(0, cursorPosition) + emoji + 
                         currentText.substring(cursorPosition)
            messageInput.setText(newText)
            messageInput.setSelection(cursorPosition + emoji.length)
        }
        
        emojiPicker.adapter = emojiAdapter
        emojiPicker.layoutManager = GridLayoutManager(this, 6)
    }
    
    private fun toggleEmojiPicker() {
        isEmojiPickerVisible = !isEmojiPickerVisible
        emojiPicker.visibility = if (isEmojiPickerVisible) View.VISIBLE else View.GONE
    }
    
    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN && isEmojiPickerVisible) {
            val emojiPickerRect = android.graphics.Rect()
            emojiPicker.getGlobalVisibleRect(emojiPickerRect)
            
            val emojiButtonRect = android.graphics.Rect()
            emojiButton.getGlobalVisibleRect(emojiButtonRect)
            
            val x = ev.rawX.toInt()
            val y = ev.rawY.toInt()
            
            // Close emoji picker if touch is outside both emoji picker and emoji button
            if (!emojiPickerRect.contains(x, y) && !emojiButtonRect.contains(x, y)) {
                isEmojiPickerVisible = false
                emojiPicker.visibility = View.GONE
            }
        }
        return super.dispatchTouchEvent(ev)
    }
}

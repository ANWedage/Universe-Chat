package com.universe.chat

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MenuItem
import android.view.MotionEvent
import android.view.View
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.addTextChangedListener
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.button.MaterialButton
import com.google.android.material.imageview.ShapeableImageView
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.realtime
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import java.util.UUID
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.Duration

class ChatActivity : AppCompatActivity() {
    private lateinit var recyclerView: RecyclerView
    private lateinit var messageInput: TextInputEditText
    private lateinit var sendButton: MaterialButton
    private lateinit var headerAvatar: ShapeableImageView
    private lateinit var headerName: TextView
    private lateinit var headerStatus: TextView
    private lateinit var emojiButton: ImageButton
    private lateinit var emojiPicker: RecyclerView
    private lateinit var replyPreview: MaterialCardView
    private lateinit var replyToName: TextView
    private lateinit var replyToMessage: TextView
    private lateinit var cancelReplyButton: ImageButton
    private lateinit var adapter: MessagesAdapter
    private lateinit var emojiAdapter: EmojiAdapter
    private val messagesList = mutableListOf<Message>()
    private val lastSeenHandler = Handler(Looper.getMainLooper())
    private val updateInterval = 30000L // 30 seconds
    private var replyingToMessage: Message? = null
    private var isEmojiPickerVisible = false
    
    private var otherUserId: String = ""
    private var otherUsername: String = ""
    private var otherFullName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        otherUserId = intent.getStringExtra("user_id") ?: ""
        otherUsername = intent.getStringExtra("username") ?: ""
        otherFullName = intent.getStringExtra("full_name") ?: ""

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = ""

        headerAvatar = findViewById(R.id.headerAvatar)
        headerName = findViewById(R.id.headerName)
        headerStatus = findViewById(R.id.headerStatus)
        recyclerView = findViewById(R.id.messagesRecyclerView)
        messageInput = findViewById(R.id.messageInput)
        sendButton = findViewById(R.id.sendButton)
        emojiButton = findViewById(R.id.emojiButton)
        emojiPicker = findViewById(R.id.emojiPicker)
        replyPreview = findViewById(R.id.replyPreview)
        replyToName = findViewById(R.id.replyToName)
        replyToMessage = findViewById(R.id.replyToMessage)
        cancelReplyButton = findViewById(R.id.cancelReplyButton)

        headerName.text = otherFullName
        
        setupRecyclerView()
        setupEmojiPicker()
        loadMessages()
        subscribeToMessages()
        startLastSeenUpdates()
        loadOtherUserStatus()

        emojiButton.setOnClickListener {
            toggleEmojiPicker()
        }
        
        cancelReplyButton.setOnClickListener {
            cancelReply()
        }

        sendButton.setOnClickListener {
            sendMessage()
        }
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
    
    private fun showReplyPreview(message: Message) {
        replyingToMessage = message
        replyToName.text = if (message.sender_id == otherUserId) otherFullName else "You"
        replyToMessage.text = message.content
        replyPreview.visibility = View.VISIBLE
    }
    
    private fun cancelReply() {
        replyingToMessage = null
        replyPreview.visibility = View.GONE
    }

    private fun startLastSeenUpdates() {
        lastSeenHandler.post(object : Runnable {
            override fun run() {
                updateMyLastSeen()
                loadOtherUserStatus()
                lastSeenHandler.postDelayed(this, updateInterval)
            }
        })
    }

    private fun updateMyLastSeen() {
        lifecycleScope.launch {
            try {
                val prefs = SharedPreferencesHelper.getInstance(this@ChatActivity)
                val currentUserId = prefs.getString("user_id", null) ?: return@launch
                
                val supabase = SupabaseClient.client
                supabase.from("profiles").update(mapOf(
                    "last_seen" to Instant.now().toString()
                )) {
                    filter {
                        eq("id", currentUserId)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun loadOtherUserStatus() {
        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val response = supabase.from("profiles").select()
                val profiles = response.decodeList<Profile>()
                val user = profiles.firstOrNull { it.id == otherUserId }
                
                if (user != null) {
                    runOnUiThread {
                        updateStatusText(user.last_seen)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun updateStatusText(lastSeen: String?) {
        if (lastSeen == null) {
            headerStatus.text = "Offline"
            headerStatus.setTextColor(getColor(android.R.color.darker_gray))
            return
        }

        try {
            val lastSeenTime = Instant.parse(lastSeen)
            val now = Instant.now()
            val duration = Duration.between(lastSeenTime, now)

            if (duration.seconds < 30) {
                headerStatus.text = "Online"
                headerStatus.setTextColor(getColor(R.color.green_400))
            } else if (duration.toMinutes() < 60) {
                headerStatus.text = "Last seen ${duration.toMinutes()} min ago"
                headerStatus.setTextColor(getColor(android.R.color.darker_gray))
            } else if (duration.toHours() < 24) {
                headerStatus.text = "Last seen ${duration.toHours()} hr ago"
                headerStatus.setTextColor(getColor(android.R.color.darker_gray))
            } else {
                headerStatus.text = "Last seen ${duration.toDays()} days ago"
                headerStatus.setTextColor(getColor(android.R.color.darker_gray))
            }
        } catch (e: Exception) {
            headerStatus.text = "Offline"
            headerStatus.setTextColor(getColor(android.R.color.darker_gray))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        lastSeenHandler.removeCallbacksAndMessages(null)
    }

    private fun subscribeToMessages() {
        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(this@ChatActivity)
                val currentUserId = prefs.getString("user_id", null) ?: return@launch

                val channel = supabase.realtime.channel("chat-${currentUserId}-${otherUserId}")
                
                // Listen for INSERT events on messages table
                channel.postgresChangeFlow<PostgresAction>(schema = "public") {
                    table = "messages"
                }.onEach { action ->
                    if (action is PostgresAction.Insert) {
                        try {
                            // Parse the message from the payload
                            val record = action.record
                            val senderId = record["sender_id"]?.toString()?.removeSurrounding("\"")
                            val receiverId = record["receiver_id"]?.toString()?.removeSurrounding("\"")
                            val messageId = record["id"]?.toString()?.removeSurrounding("\"")
                            val groupId = record["group_id"]?.toString()?.removeSurrounding("\"")
                            
                            // Only process direct messages (not group messages)
                            if (groupId == null || groupId == "null") {
                                // Only process if this message is from the other user to current user
                                // (we already added our own sent messages immediately)
                                if (senderId == otherUserId && receiverId == currentUserId) {
                                    // Load the complete message from database
                                    val response = supabase.from("messages")
                                        .select()
                                    val allMessages = response.decodeList<Message>()
                                    val newMessage = allMessages.firstOrNull { it.id == messageId }
                                    
                                    if (newMessage != null) {
                                        runOnUiThread {
                                            // Check if message already exists
                                            if (!messagesList.any { it.id == newMessage.id }) {
                                                messagesList.add(newMessage)
                                                adapter.notifyItemInserted(messagesList.size - 1)
                                                recyclerView.scrollToPosition(messagesList.size - 1)
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }.launchIn(lifecycleScope)
                
                channel.subscribe()
            } catch (e: Exception) {
                e.printStackTrace()
                // Realtime is optional - app will still work with manual refresh
            }
        }
    }

    private fun setupRecyclerView() {
        val prefs = SharedPreferencesHelper.getInstance(this)
        val currentUserId = prefs.getString("user_id", null) ?: ""
        
        adapter = MessagesAdapter(messagesList, currentUserId)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }
    private fun loadMessages() {
        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(this@ChatActivity)
                val currentUserId = prefs.getString("user_id", null) ?: return@launch

                val messagesResponse = supabase.from("messages")
                    .select()
                    
                val messages = messagesResponse.decodeList<Message>()
                    .filter { 
                        it.group_id == null &&
                        ((it.sender_id == currentUserId && it.receiver_id == otherUserId) ||
                        (it.sender_id == otherUserId && it.receiver_id == currentUserId))
                    }
                    .sortedBy { it.created_at }

                runOnUiThread {
                    messagesList.clear()
                    messagesList.addAll(messages)
                    adapter.notifyDataSetChanged()
                    if (messagesList.isNotEmpty()) {
                        recyclerView.scrollToPosition(messagesList.size - 1)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this@ChatActivity, "Failed to load messages: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun sendMessage() {
        val content = messageInput.text.toString().trim()
        if (content.isEmpty()) return

        lifecycleScope.launch {
            try {
                val supabase = SupabaseClient.client
                val prefs = SharedPreferencesHelper.getInstance(this@ChatActivity)
                val currentUserId = prefs.getString("user_id", null) ?: return@launch

                val message = mutableMapOf(
                    "sender_id" to currentUserId,
                    "receiver_id" to otherUserId,
                    "content" to content
                )
                
                // Add reply_to if replying
                if (replyingToMessage != null) {
                    message["reply_to"] = replyingToMessage!!.id
                }

                // Insert into database
                val response = supabase.from("messages").insert(message) {
                    select()
                }
                
                // Get the inserted message and add to UI immediately
                val insertedMessages = response.decodeList<Message>()
                if (insertedMessages.isNotEmpty()) {
                    val newMessage = insertedMessages.first()
                    runOnUiThread {
                        if (!messagesList.any { it.id == newMessage.id }) {
                            messagesList.add(newMessage)
                            adapter.notifyItemInserted(messagesList.size - 1)
                            recyclerView.scrollToPosition(messagesList.size - 1)
                        }
                    }
                }

                runOnUiThread {
                    messageInput.text?.clear()
                    cancelReply()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this@ChatActivity, "Failed to send message: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun isEncryptedContent(content: String): Boolean {
        // Detect base64 encrypted content (old messages)
        return content.matches(Regex("^[A-Za-z0-9+/=]+$")) && content.length > 20
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

package com.universe.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.imageview.ShapeableImageView

class ChatsAdapter(
    private val chats: List<ChatItem>,
    private val onChatClick: (ChatItem) -> Unit
) : RecyclerView.Adapter<ChatsAdapter.ChatViewHolder>() {

    inner class ChatViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val avatar: ShapeableImageView = itemView.findViewById(R.id.avatarImage)
        val fullName: TextView = itemView.findViewById(R.id.fullNameText)
        val lastMessage: TextView = itemView.findViewById(R.id.lastMessageText)
        val timestamp: TextView = itemView.findViewById(R.id.timestampText)
        val unreadBadge: TextView = itemView.findViewById(R.id.unreadBadge)

        init {
            itemView.setOnClickListener {
                onChatClick(chats[adapterPosition])
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_chat, parent, false)
        return ChatViewHolder(view)
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        val chat = chats[position]
        holder.fullName.text = chat.fullName
        holder.lastMessage.text = chat.lastMessage
        holder.timestamp.text = formatTimestamp(chat.timestamp)
        
        if (chat.unreadCount > 0) {
            holder.unreadBadge.visibility = View.VISIBLE
            holder.unreadBadge.text = chat.unreadCount.toString()
        } else {
            holder.unreadBadge.visibility = View.GONE
        }
    }

    override fun getItemCount() = chats.size

    private fun formatTimestamp(timestamp: String): String {
        // Simple timestamp formatting - you can enhance this
        return try {
            val instant = java.time.Instant.parse(timestamp)
            val now = java.time.Instant.now()
            val duration = java.time.Duration.between(instant, now)
            
            when {
                duration.toMinutes() < 1 -> "Just now"
                duration.toHours() < 1 -> "${duration.toMinutes()}m ago"
                duration.toDays() < 1 -> "${duration.toHours()}h ago"
                duration.toDays() < 7 -> "${duration.toDays()}d ago"
                else -> "${duration.toDays() / 7}w ago"
            }
        } catch (e: Exception) {
            ""
        }
    }
}

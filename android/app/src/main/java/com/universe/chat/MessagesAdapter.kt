package com.universe.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class MessagesAdapter(
    private val messages: List<Message>,
    private val currentUserId: String,
    private val isGroupChat: Boolean = false,
    private val senderProfiles: Map<String, Profile> = emptyMap()
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    companion object {
        const val VIEW_TYPE_SENT = 1
        const val VIEW_TYPE_RECEIVED = 2
    }

    inner class SentMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val messageText: TextView = itemView.findViewById(R.id.messageText)
        val timestampText: TextView = itemView.findViewById(R.id.timestampText)
    }

    inner class ReceivedMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val senderName: TextView = itemView.findViewById(R.id.senderName)
        val messageText: TextView = itemView.findViewById(R.id.messageText)
        val timestampText: TextView = itemView.findViewById(R.id.timestampText)
    }

    override fun getItemViewType(position: Int): Int {
        return if (messages[position].sender_id == currentUserId) {
            VIEW_TYPE_SENT
        } else {
            VIEW_TYPE_RECEIVED
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == VIEW_TYPE_SENT) {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_message_sent, parent, false)
            SentMessageViewHolder(view)
        } else {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_message_received, parent, false)
            ReceivedMessageViewHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = messages[position]
        
        when (holder) {
            is SentMessageViewHolder -> {
                holder.messageText.text = message.content
                holder.timestampText.text = formatTimestamp(message.created_at)
            }
            is ReceivedMessageViewHolder -> {
                holder.messageText.text = message.content
                holder.timestampText.text = formatTimestamp(message.created_at)
                
                // Show sender name only in group chats
                if (isGroupChat) {
                    val senderProfile = senderProfiles[message.sender_id]
                    if (senderProfile != null) {
                        holder.senderName.text = senderProfile.full_name
                        holder.senderName.visibility = View.VISIBLE
                    } else {
                        holder.senderName.visibility = View.GONE
                    }
                } else {
                    holder.senderName.visibility = View.GONE
                }
            }
        }
    }

    override fun getItemCount() = messages.size

    private fun formatTimestamp(timestamp: String): String {
        return try {
            val instant = java.time.Instant.parse(timestamp)
            val formatter = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                .withZone(java.time.ZoneId.systemDefault())
            formatter.format(instant)
        } catch (e: Exception) {
            ""
        }
    }
}

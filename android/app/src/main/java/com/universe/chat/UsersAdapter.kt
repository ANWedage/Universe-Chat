package com.universe.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.imageview.ShapeableImageView

class UsersAdapter(
    private val users: List<Profile>,
    private val onUserClick: (Profile) -> Unit
) : RecyclerView.Adapter<UsersAdapter.UserViewHolder>() {

    inner class UserViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val avatar: ShapeableImageView = itemView.findViewById(R.id.avatarImage)
        val fullName: TextView = itemView.findViewById(R.id.fullNameText)
        val username: TextView = itemView.findViewById(R.id.usernameText)

        init {
            itemView.setOnClickListener {
                onUserClick(users[adapterPosition])
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_user, parent, false)
        return UserViewHolder(view)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        val user = users[position]
        holder.fullName.text = user.full_name
        holder.username.text = "@${user.username}"
    }

    override fun getItemCount() = users.size
}

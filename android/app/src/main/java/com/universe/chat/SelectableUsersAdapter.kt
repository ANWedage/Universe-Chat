package com.universe.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.google.android.material.imageview.ShapeableImageView

class SelectableUsersAdapter(
    private var users: List<Profile>,
    private val selectedUsers: MutableSet<String>,
    private val onSelectionChanged: (Int) -> Unit
) : RecyclerView.Adapter<SelectableUsersAdapter.UserViewHolder>() {

    inner class UserViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val userCheckbox: CheckBox = itemView.findViewById(R.id.userCheckbox)
        private val userAvatar: ShapeableImageView = itemView.findViewById(R.id.userAvatar)
        private val userInitial: TextView = itemView.findViewById(R.id.userInitial)
        private val userFullName: TextView = itemView.findViewById(R.id.userFullName)
        private val userUsername: TextView = itemView.findViewById(R.id.userUsername)

        fun bind(user: Profile) {
            userFullName.text = user.full_name
            userUsername.text = "@${user.username}"

            // Hide both avatar and initial - only show checkbox and text
            userAvatar.visibility = View.GONE
            userInitial.visibility = View.GONE

            userCheckbox.isChecked = selectedUsers.contains(user.id)

            itemView.setOnClickListener {
                if (selectedUsers.contains(user.id)) {
                    selectedUsers.remove(user.id)
                } else {
                    selectedUsers.add(user.id)
                }
                userCheckbox.isChecked = selectedUsers.contains(user.id)
                onSelectionChanged(selectedUsers.size)
            }

            userCheckbox.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    selectedUsers.add(user.id)
                } else {
                    selectedUsers.remove(user.id)
                }
                onSelectionChanged(selectedUsers.size)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_user_selectable, parent, false)
        return UserViewHolder(view)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        holder.bind(users[position])
    }

    override fun getItemCount() = users.size

    fun updateUsers(newUsers: List<Profile>) {
        users = newUsers
        notifyDataSetChanged()
    }

    fun filterUsers(query: String, allUsers: List<Profile>) {
        users = if (query.isEmpty()) {
            allUsers
        } else {
            allUsers.filter {
                it.full_name.contains(query, ignoreCase = true) ||
                it.username.contains(query, ignoreCase = true)
            }
        }
        notifyDataSetChanged()
    }
}

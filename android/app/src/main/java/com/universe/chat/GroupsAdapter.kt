package com.universe.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.google.android.material.imageview.ShapeableImageView

class GroupsAdapter(
    private val groups: MutableList<Group>,
    private val currentUserId: String,
    private val onGroupClick: (Group) -> Unit
) : RecyclerView.Adapter<GroupsAdapter.GroupViewHolder>() {

    inner class GroupViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val groupAvatar: ShapeableImageView = itemView.findViewById(R.id.groupAvatar)
        private val groupInitial: TextView = itemView.findViewById(R.id.groupInitial)
        private val groupName: TextView = itemView.findViewById(R.id.groupName)
        private val groupSubtitle: TextView = itemView.findViewById(R.id.groupSubtitle)

        fun bind(group: Group) {
            groupName.text = group.name
            
            val subtitle = if (group.created_by == currentUserId) "Created by you" else "Group chat"
            groupSubtitle.text = subtitle

            val initial = group.name.firstOrNull()?.uppercaseChar()?.toString() ?: "G"
            groupInitial.text = initial

            if (!group.photo_url.isNullOrEmpty()) {
                groupAvatar.visibility = View.VISIBLE
                groupInitial.visibility = View.GONE
                groupAvatar.load(group.photo_url) {
                    placeholder(R.color.purple_400)
                    error(R.color.purple_400)
                }
            } else {
                groupAvatar.visibility = View.GONE
                groupInitial.visibility = View.VISIBLE
            }

            itemView.setOnClickListener {
                onGroupClick(group)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GroupViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_group, parent, false)
        return GroupViewHolder(view)
    }

    override fun onBindViewHolder(holder: GroupViewHolder, position: Int) {
        holder.bind(groups[position])
    }

    override fun getItemCount() = groups.size
}

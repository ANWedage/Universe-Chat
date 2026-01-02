package com.universe.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.google.android.material.imageview.ShapeableImageView

class GroupMembersAdapter(
    private val members: List<GroupMember>,
    private val currentUserId: String,
    private val creatorId: String,
    private val onRemoveMember: (GroupMember) -> Unit
) : RecyclerView.Adapter<GroupMembersAdapter.MemberViewHolder>() {

    inner class MemberViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val memberAvatar: ShapeableImageView = itemView.findViewById(R.id.memberAvatar)
        private val memberInitial: TextView = itemView.findViewById(R.id.memberInitial)
        private val memberName: TextView = itemView.findViewById(R.id.memberName)
        private val memberRole: TextView = itemView.findViewById(R.id.memberRole)
        private val removeButton: ImageButton = itemView.findViewById(R.id.removeButton)

        fun bind(member: GroupMember) {
            val profile = member.profiles
            val name = profile?.full_name ?: "Unknown"
            val username = profile?.username ?: ""

            memberName.text = name
            
            memberRole.text = when {
                member.user_id == creatorId -> "Admin"
                else -> "@$username"
            }

            val initial = name.firstOrNull()?.uppercaseChar()?.toString() ?: "U"
            memberInitial.text = initial

            if (!profile?.avatar_url.isNullOrEmpty()) {
                memberAvatar.visibility = View.VISIBLE
                memberInitial.visibility = View.GONE
                memberAvatar.load(profile?.avatar_url) {
                    placeholder(R.color.green_400)
                    error(R.color.green_400)
                }
            } else {
                memberAvatar.visibility = View.GONE
                memberInitial.visibility = View.VISIBLE
            }

            // Show remove button only for creator and not for themselves
            removeButton.visibility = if (currentUserId == creatorId && member.user_id != currentUserId) {
                View.VISIBLE
            } else {
                View.GONE
            }

            removeButton.setOnClickListener {
                onRemoveMember(member)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MemberViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_group_member, parent, false)
        return MemberViewHolder(view)
    }

    override fun onBindViewHolder(holder: MemberViewHolder, position: Int) {
        holder.bind(members[position])
    }

    override fun getItemCount() = members.size
}

package com.universe.chat

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.Window
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class GroupSettingsDialog(
    context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val groupId: String,
    private val groupName: String,
    private val groupPhoto: String?,
    private val createdBy: String,
    private val currentUserId: String,
    private val onGroupUpdated: (String, String?) -> Unit,
    private val onGroupLeft: () -> Unit
) : Dialog(context, R.style.Theme_UniverseChat) {

    private lateinit var groupNameInput: EditText
    private lateinit var membersRecyclerView: RecyclerView
    private lateinit var addMemberButton: MaterialButton
    private lateinit var updateButton: MaterialButton
    private lateinit var leaveGroupButton: MaterialButton
    
    private val members = mutableListOf<GroupMember>()
    private lateinit var membersAdapter: GroupMembersAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        setContentView(R.layout.dialog_group_settings)
        
        window?.setLayout(
            (context.resources.displayMetrics.widthPixels * 0.9).toInt(),
            android.view.ViewGroup.LayoutParams.WRAP_CONTENT
        )
        window?.setBackgroundDrawableResource(android.R.color.transparent)
        
        initializeViews()
        setupListeners()
        loadMembers()
    }
    
    private fun initializeViews() {
        groupNameInput = findViewById(R.id.groupNameInput)
        membersRecyclerView = findViewById(R.id.membersRecyclerView)
        addMemberButton = findViewById(R.id.addMemberButton)
        updateButton = findViewById(R.id.updateButton)
        leaveGroupButton = findViewById(R.id.leaveGroupButton)
        
        groupNameInput.setText(groupName)
        
        // Show add member button only for creator
        addMemberButton.visibility = if (currentUserId == createdBy) {
            android.view.View.VISIBLE
        } else {
            android.view.View.GONE
        }
        
        // Show update button only for creator
        updateButton.visibility = if (currentUserId == createdBy) {
            android.view.View.VISIBLE
        } else {
            android.view.View.GONE
        }
        
        membersAdapter = GroupMembersAdapter(members, currentUserId, createdBy) { member ->
            removeMember(member)
        }
        
        membersRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = membersAdapter
        }
    }
    
    private fun setupListeners() {
        addMemberButton.setOnClickListener {
            showAddMemberDialog()
        }
        
        updateButton.setOnClickListener {
            updateGroup()
        }
        
        leaveGroupButton.setOnClickListener {
            confirmLeaveGroup()
        }
    }
    
    private fun loadMembers() {
        lifecycleOwner.lifecycleScope.launch {
            try {
                val allMembers = withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("group_members")
                        .select {
                            filter {
                                eq("group_id", groupId)
                            }
                        }
                        .decodeList<GroupMember>()
                }
                
                // Load profiles for each member
                val memberProfiles = withContext(Dispatchers.IO) {
                    allMembers.map { member ->
                        val profile = SupabaseClient.client.from("profiles")
                            .select()
                            .decodeList<Profile>()
                            .firstOrNull { it.id == member.user_id }
                        
                        member.copy(profiles = profile)
                    }
                }
                
                withContext(Dispatchers.Main) {
                    members.clear()
                    members.addAll(memberProfiles)
                    membersAdapter.notifyDataSetChanged()
                }
                
            } catch (e: Exception) {
                Log.e("GroupSettingsDialog", "Error loading members", e)
            }
        }
    }
    
    private fun showAddMemberDialog() {
        val addDialog = CreateGroupDialog(
            context = context,
            lifecycleOwner = lifecycleOwner,
            isAddingMembers = true,
            onGroupCreated = { _, selectedUserIds ->
                addMembers(selectedUserIds)
            }
        )
        addDialog.show()
    }
    
    private fun addMembers(userIds: List<String>) {
        lifecycleOwner.lifecycleScope.launch {
            try {
                // Filter out existing members
                val existingMemberIds = members.map { it.user_id }.toSet()
                val newUserIds = userIds.filter { it !in existingMemberIds }
                
                if (newUserIds.isEmpty()) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Users already in group", Toast.LENGTH_SHORT).show()
                    }
                    return@launch
                }
                
                val memberData = newUserIds.map { userId ->
                    mapOf("group_id" to groupId, "user_id" to userId)
                }
                
                withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("group_members").insert(memberData)
                }
                
                loadMembers()
                onGroupUpdated(groupName, groupPhoto)
                
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Members added successfully", Toast.LENGTH_SHORT).show()
                }
                
            } catch (e: Exception) {
                Log.e("GroupSettingsDialog", "Error adding members", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Failed to add members", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun removeMember(member: GroupMember) {
        AlertDialog.Builder(context)
            .setTitle("Remove Member")
            .setMessage("Are you sure you want to remove this member?")
            .setPositiveButton("Remove") { _, _ ->
                lifecycleOwner.lifecycleScope.launch {
                    try {
                        withContext(Dispatchers.IO) {
                            SupabaseClient.client.from("group_members")
                                .delete {
                                    filter {
                                        eq("id", member.id)
                                    }
                                }
                        }
                        
                        loadMembers()
                        onGroupUpdated(groupName, groupPhoto)
                        
                        withContext(Dispatchers.Main) {
                            Toast.makeText(context, "Member removed", Toast.LENGTH_SHORT).show()
                        }
                        
                    } catch (e: Exception) {
                        Log.e("GroupSettingsDialog", "Error removing member", e)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(context, "Failed to remove member", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun updateGroup() {
        val newName = groupNameInput.text.toString().trim()
        
        if (newName.isEmpty()) {
            Toast.makeText(context, "Please enter group name", Toast.LENGTH_SHORT).show()
            return
        }
        
        lifecycleOwner.lifecycleScope.launch {
            try {
                val updateData = mapOf("name" to newName)
                
                withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("groups")
                        .update(updateData) {
                            filter {
                                eq("id", groupId)
                            }
                        }
                }
                
                onGroupUpdated(newName, groupPhoto)
                
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Group updated successfully", Toast.LENGTH_SHORT).show()
                    dismiss()
                }
                
            } catch (e: Exception) {
                Log.e("GroupSettingsDialog", "Error updating group", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Failed to update group", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun confirmLeaveGroup() {
        val isCreator = currentUserId == createdBy
        val message = if (isCreator) {
            "You are the creator. Leaving will delete this group and remove all members. Continue?"
        } else {
            "Are you sure you want to leave this group?"
        }
        
        AlertDialog.Builder(context)
            .setTitle("Leave Group")
            .setMessage(message)
            .setPositiveButton("Leave") { _, _ ->
                leaveGroup()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun leaveGroup() {
        lifecycleOwner.lifecycleScope.launch {
            try {
                val isCreator = currentUserId == createdBy
                
                if (isCreator) {
                    // Creator leaving: delete entire group and all members
                    withContext(Dispatchers.IO) {
                        // Delete all group members first
                        SupabaseClient.client.from("group_members")
                            .delete {
                                filter {
                                    eq("group_id", groupId)
                                }
                            }
                        
                        // Delete all group messages
                        SupabaseClient.client.from("messages")
                            .delete {
                                filter {
                                    eq("group_id", groupId)
                                }
                            }
                        
                        // Delete the group itself
                        SupabaseClient.client.from("groups")
                            .delete {
                                filter {
                                    eq("id", groupId)
                                }
                            }
                    }
                    
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Group deleted successfully", Toast.LENGTH_SHORT).show()
                        dismiss()
                        onGroupLeft()
                    }
                } else {
                    // Regular member leaving: just remove their membership
                    val membership = members.firstOrNull { it.user_id == currentUserId }
                    
                    if (membership != null) {
                        withContext(Dispatchers.IO) {
                            SupabaseClient.client.from("group_members")
                                .delete {
                                    filter {
                                        eq("id", membership.id)
                                    }
                                }
                        }
                        
                        withContext(Dispatchers.Main) {
                            Toast.makeText(context, "Left group successfully", Toast.LENGTH_SHORT).show()
                            dismiss()
                            onGroupLeft()
                        }
                    }
                }
                
            } catch (e: Exception) {
                Log.e("GroupSettingsDialog", "Error leaving group", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Failed to leave group", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}

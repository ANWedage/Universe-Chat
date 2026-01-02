package com.universe.chat

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class GroupsFragment : Fragment() {
    
    private lateinit var groupsRecyclerView: RecyclerView
    private lateinit var createGroupButton: FloatingActionButton
    private lateinit var groupsAdapter: GroupsAdapter
    
    private val groups = mutableListOf<Group>()
    private var currentUserId: String? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_groups, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        val prefs = SharedPreferencesHelper.getInstance(requireContext())
        currentUserId = prefs.getString("user_id", null)
        
        groupsRecyclerView = view.findViewById(R.id.groupsRecyclerView)
        createGroupButton = view.findViewById(R.id.createGroupButton)
        
        setupRecyclerView()
        
        createGroupButton.setOnClickListener {
            showCreateGroupDialog()
        }
        
        loadGroups()
    }
    
    private fun setupRecyclerView() {
        groupsAdapter = GroupsAdapter(groups, currentUserId ?: "") { group ->
            openGroupChat(group)
        }
        
        groupsRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = groupsAdapter
        }
    }
    
    private fun loadGroups() {
        lifecycleScope.launch {
            try {
                val userId = currentUserId ?: return@launch
                
                // Get all group memberships for current user
                val groupMembers = SupabaseClient.client.from("group_members")
                    .select()
                    .decodeList<GroupMember>()
                    .filter { it.user_id == userId }
                
                val groupIds = groupMembers.map { it.group_id }
                
                if (groupIds.isEmpty()) {
                    groups.clear()
                    groupsAdapter.notifyDataSetChanged()
                    return@launch
                }
                
                // Get all groups
                val allGroups = SupabaseClient.client.from("groups")
                    .select()
                    .decodeList<Group>()
                    .filter { it.id in groupIds }
                
                groups.clear()
                groups.addAll(allGroups)
                groupsAdapter.notifyDataSetChanged()
                
            } catch (e: Exception) {
                Log.e("GroupsFragment", "Error loading groups", e)
                Toast.makeText(requireContext(), "Failed to load groups", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun showCreateGroupDialog() {
        val dialog = CreateGroupDialog(
            context = requireContext(),
            lifecycleOwner = viewLifecycleOwner,
            onGroupCreated = { groupName, selectedUserIds ->
                createGroup(groupName, selectedUserIds)
            }
        )
        dialog.show()
    }
    
    private fun createGroup(groupName: String, memberIds: List<String>) {
        lifecycleScope.launch {
            try {
                val userId = currentUserId ?: return@launch
                
                Log.d("GroupsFragment", "Creating group: $groupName with ${memberIds.size} members")
                
                // Create group
                val groupData = mapOf(
                    "name" to groupName,
                    "created_by" to userId
                )
                
                val newGroups = withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("groups")
                        .insert(groupData) {
                            select()
                        }
                        .decodeList<Group>()
                }
                
                val newGroup = newGroups.firstOrNull()
                if (newGroup == null) {
                    Log.e("GroupsFragment", "Failed to get new group after insert")
                    withContext(Dispatchers.Main) {
                        Toast.makeText(requireContext(), "Failed to create group", Toast.LENGTH_SHORT).show()
                    }
                    return@launch
                }
                
                Log.d("GroupsFragment", "Group created with ID: ${newGroup.id}")
                
                // Add creator as member
                val members = mutableListOf(
                    mapOf("group_id" to newGroup.id, "user_id" to userId)
                )
                
                // Add selected members
                members.addAll(memberIds.map { memberId ->
                    mapOf("group_id" to newGroup.id, "user_id" to memberId)
                })
                
                Log.d("GroupsFragment", "Adding ${members.size} members to group")
                
                withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("group_members").insert(members)
                }
                
                // Reload groups
                loadGroups()
                
                withContext(Dispatchers.Main) {
                    Toast.makeText(requireContext(), "Group created successfully", Toast.LENGTH_SHORT).show()
                }
                
            } catch (e: Exception) {
                Log.e("GroupsFragment", "Error creating group: ${e.message}", e)
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    Toast.makeText(requireContext(), "Failed to create group: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun openGroupChat(group: Group) {
        val intent = Intent(requireContext(), GroupChatActivity::class.java)
        intent.putExtra("group_id", group.id)
        intent.putExtra("group_name", group.name)
        intent.putExtra("group_photo", group.photo_url)
        intent.putExtra("created_by", group.created_by)
        startActivity(intent)
    }
    
    override fun onResume() {
        super.onResume()
        loadGroups()
    }
}

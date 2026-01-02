package com.universe.chat

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.Window
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CreateGroupDialog(
    context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val isAddingMembers: Boolean = false,
    private val onGroupCreated: (String, List<String>) -> Unit
) : Dialog(context, R.style.Theme_UniverseChat) {

    private lateinit var titleText: TextView
    private lateinit var groupNameInput: EditText
    private lateinit var groupNameLayout: com.google.android.material.textfield.TextInputLayout
    private lateinit var searchInput: EditText
    private lateinit var selectedCount: TextView
    private lateinit var usersRecyclerView: RecyclerView
    private lateinit var createButton: MaterialButton
    private lateinit var cancelButton: MaterialButton
    
    private val selectedUsers = mutableSetOf<String>()
    private lateinit var usersAdapter: SelectableUsersAdapter
    private val allUsers = mutableListOf<Profile>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        setContentView(R.layout.dialog_create_group)
        
        window?.setLayout(
            (context.resources.displayMetrics.widthPixels * 0.9).toInt(),
            android.view.ViewGroup.LayoutParams.WRAP_CONTENT
        )
        window?.setBackgroundDrawableResource(android.R.color.transparent)
        
        initializeViews()
        setupListeners()
        loadUsers()
    }
    
    private fun initializeViews() {
        titleText = findViewById(R.id.dialogTitle)
        groupNameInput = findViewById(R.id.groupNameInput)
        groupNameLayout = findViewById(R.id.groupNameLayout)
        searchInput = findViewById(R.id.searchInput)
        selectedCount = findViewById(R.id.selectedCount)
        usersRecyclerView = findViewById(R.id.usersRecyclerView)
        createButton = findViewById(R.id.createButton)
        cancelButton = findViewById(R.id.cancelButton)
        
        // Hide group name input if adding members to existing group
        if (isAddingMembers) {
            titleText.text = "Add Members"
            groupNameLayout.visibility = android.view.View.GONE
            createButton.text = "Add Members"
        }
        
        usersAdapter = SelectableUsersAdapter(mutableListOf(), selectedUsers) {
            selectedCount.text = "$it members selected"
        }
        
        usersRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = usersAdapter
        }
    }
    
    private fun setupListeners() {
        createButton.setOnClickListener {
            val groupName = if (isAddingMembers) "" else groupNameInput.text.toString().trim()
            
            if (!isAddingMembers && groupName.isEmpty()) {
                Toast.makeText(context, "Please enter group name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            if (selectedUsers.isEmpty()) {
                Toast.makeText(context, "Please select at least one member", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            onGroupCreated(groupName, selectedUsers.toList())
            dismiss()
        }
        
        cancelButton.setOnClickListener {
            dismiss()
        }
        
        searchInput.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                filterUsers(s.toString())
            }
        })
    }
    
    private fun loadUsers() {
        lifecycleOwner.lifecycleScope.launch {
            try {
                val prefs = SharedPreferencesHelper.getInstance(context)
                val currentUserId = prefs.getString("user_id", null)
                
                val users = withContext(Dispatchers.IO) {
                    SupabaseClient.client.from("profiles")
                        .select()
                        .decodeList<Profile>()
                        .filter { it.id != currentUserId }
                }
                
                withContext(Dispatchers.Main) {
                    allUsers.clear()
                    allUsers.addAll(users)
                    usersAdapter.updateUsers(users)
                    
                    Log.d("CreateGroupDialog", "Loaded ${users.size} users")
                }
                
            } catch (e: Exception) {
                Log.e("CreateGroupDialog", "Error loading users", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Failed to load users", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun filterUsers(query: String) {
        usersAdapter.filterUsers(query, allUsers)
    }
}

package com.universe.chat

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class Profile(
    val id: String,
    val username: String,
    val email: String,
    @SerialName("full_name")
    val full_name: String,
    @SerialName("avatar_url")
    val avatar_url: String? = null,
    @SerialName("last_seen")
    val last_seen: String? = null
)

@Serializable
data class Message(
    val id: String,
    @SerialName("sender_id")
    val sender_id: String,
    @SerialName("receiver_id")
    val receiver_id: String? = null,
    @SerialName("group_id")
    val group_id: String? = null,
    val content: String,
    @SerialName("created_at")
    val created_at: String,
    val read: Boolean = false,
    val delivered: Boolean = false,
    @SerialName("deleted_by_sender")
    val deleted_by_sender: Boolean = false,
    @SerialName("deleted_by_receiver")
    val deleted_by_receiver: Boolean = false,
    @SerialName("image_url")
    val image_url: String? = null,
    @SerialName("reply_to")
    val reply_to: String? = null
)

@Serializable
data class Group(
    val id: String,
    val name: String,
    @SerialName("created_by")
    val created_by: String,
    @SerialName("created_at")
    val created_at: String,
    @SerialName("photo_url")
    val photo_url: String? = null,
    @SerialName("delete_timer")
    val delete_timer: String? = null
)

@Serializable
data class GroupMember(
    val id: String,
    @SerialName("group_id")
    val group_id: String,
    @SerialName("user_id")
    val user_id: String,
    @SerialName("joined_at")
    val joined_at: String,
    val profiles: Profile? = null
)

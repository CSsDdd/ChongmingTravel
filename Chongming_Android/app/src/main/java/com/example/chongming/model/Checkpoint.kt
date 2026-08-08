package com.example.chongming.model

data class Checkpoint(
    val id: String,
    val authorUserId: String,
    val currentPublishedVersion: Long?,
    val createdAtEpochMillis: Long,
)

package com.example.chongming.model

data class CheckpointVersion(
    val checkpointId: String,
    val version: Long,
    val location: CheckpointLocation,
    val title: String,
    val shortText: String,
    val imageId: String,
    val tagIds: List<String>,
    val publishedAtEpochMillis: Long,
)

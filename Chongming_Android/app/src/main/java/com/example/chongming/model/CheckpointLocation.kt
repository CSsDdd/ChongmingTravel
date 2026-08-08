package com.example.chongming.model

data class CheckpointLocation(
    val latitude: Double,
    val longitude: Double,
    val locationName: String,
    val coordinateSystem: CoordinateSystem,
)

enum class CoordinateSystem {
    WGS84,
    GCJ02,
}

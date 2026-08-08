package com.example.chongming.model

import androidx.annotation.DrawableRes

data class BannerNotification(
    val id: String,
    val title: String,
    val summary: String,
    @DrawableRes val imageResId: Int,
)

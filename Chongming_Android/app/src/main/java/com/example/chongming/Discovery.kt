package com.example.chongming

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.snapping.SnapPosition
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.chongming.model.BannerNotification
import com.example.chongming.model.CheckpointLocation
import com.example.chongming.model.CheckpointVersion
import com.example.chongming.model.CoordinateSystem

private val sampleNotifications = listOf(
    BannerNotification(
        id = "wetland_walk",
        title = "东滩湿地周末观察",
        summary = "沿观鸟步道寻找夏季候鸟",
        imageResId = R.drawable.ic_launcher_background,
    ),
    BannerNotification(
        id = "forest_ride",
        title = "森林骑行体验",
        summary = "适合家庭参与的轻量骑行路线",
        imageResId = R.drawable.ic_launcher_background,
    ),
    BannerNotification(
        id = "sunset_camp",
        title = "江畔日落小营地",
        summary = "傍晚集合，一起记录崇明落日",
        imageResId = R.drawable.ic_launcher_background,
    ),
)

// TODO: Replace with a Repository Flow backed by the current-version database join.
private val sampleCheckpoints = listOf(
    CheckpointVersion(
        checkpointId = "sample_birdwatching_deck",
        version = 1,
        location = CheckpointLocation(31.62, 121.93, "东滩观鸟步道", CoordinateSystem.GCJ02),
        title = "藏在东滩芦苇边的观鸟视角",
        shortText = "沿木栈道走到开阔处，适合安静观察湿地鸟类。",
        imageId = "sample/checkpoint_birdwatching",
        tagIds = listOf("湿地", "观鸟", "亲子"),
        publishedAtEpochMillis = 0L,
    ),
    CheckpointVersion(
        checkpointId = "sample_metasequoia_road",
        version = 1,
        location = CheckpointLocation(31.68, 121.48, "森林公园水杉路", CoordinateSystem.GCJ02),
        title = "水杉林间的笔直小路",
        shortText = "树影覆盖的林间道路，适合散步和拍摄纵深构图。",
        imageId = "sample/checkpoint_metasequoia",
        tagIds = listOf("森林", "摄影", "步行"),
        publishedAtEpochMillis = 0L,
    ),
    CheckpointVersion(
        checkpointId = "sample_lakeside_walk",
        version = 1,
        location = CheckpointLocation(31.73, 121.25, "湖畔木栈道", CoordinateSystem.GCJ02),
        title = "贴近水面的湖畔栈道",
        shortText = "傍晚光线柔和，可以沿水边完成一段轻松步行。",
        imageId = "sample/checkpoint_lakeside",
        tagIds = listOf("湖景", "日落", "轻徒步"),
        publishedAtEpochMillis = 0L,
    ),
    CheckpointVersion(
        checkpointId = "sample_riverside_grass",
        version = 1,
        location = CheckpointLocation(31.35, 121.84, "江堤草地", CoordinateSystem.GCJ02),
        title = "看风吹草浪的江堤",
        shortText = "视野开阔、风力较大，适合短暂停留和观察云层。",
        imageId = "sample/checkpoint_riverside",
        tagIds = listOf("江景", "草地", "自然观察"),
        publishedAtEpochMillis = 0L,
    ),
)

internal fun findSampleCheckpoint(
    checkpointId: String,
    version: Long,
): CheckpointVersion? = sampleCheckpoints.firstOrNull {
    it.checkpointId == checkpointId && it.version == version
}

@Composable
fun DiscoverScreen(
    contentPadding: PaddingValues,
    onCheckpointClick: (CheckpointVersion) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding),
    ) {
        // 活动页签
        val pagerState = rememberPagerState(
            pageCount = { sampleNotifications.size },
        )
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f),
            contentPadding = PaddingValues(horizontal = 16.dp),
            pageSpacing = 12.dp,
        ) { page ->
            NotificationBanner(
                notification = sampleNotifications[page],
                onClick = { },
            )
        }
        // 活动页签指示小点
        Row(
            modifier = Modifier
                .align(alignment = Alignment.CenterHorizontally)
                .padding(top = 8.dp,),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ){
            repeat(sampleNotifications.size) { page ->
                Box(
                    modifier = Modifier
                        .size(if (page == pagerState.currentPage) 10.dp else 6.dp)
                        .clip(CircleShape)
                        .background(
                            if (page == pagerState.currentPage) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outlineVariant
                            }
                        ),
                )
            }
        }
        //推荐打卡点文本
        Text(
            text = "推荐打卡点",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )
        //推荐打卡点
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(
                items = sampleCheckpoints,
                key = { it.checkpointId to it.version },
            ) { checkpoint ->
                CheckpointCard(
                    checkpoint = checkpoint,
                    onClick = { onCheckpointClick(checkpoint) },
                )
            }
        }
    }
}

@Composable
fun NotificationBanner(
    notification: BannerNotification,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(onClick = onClick, modifier = modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(notification.imageResId),
                contentDescription = notification.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(16.dp),
            ) {
                Text(
                    text = notification.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Text(
                    text = notification.summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                )
            }
        }
    }
}

@Composable
fun CheckpointCard(
    checkpoint: CheckpointVersion,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(onClick = onClick, modifier = modifier.fillMaxWidth()) {
        Image(
            painter = painterResource(R.drawable.ic_launcher_background),
            contentDescription = checkpoint.title,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(4f / 3f),
            contentScale = ContentScale.Crop,
        )
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = checkpoint.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = checkpoint.location.locationName,
                modifier = Modifier.padding(top = 8.dp),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = checkpoint.tagIds.joinToString(separator = " · "),
                modifier = Modifier.padding(top = 4.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

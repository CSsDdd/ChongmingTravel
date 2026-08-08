package com.example.chongming

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.chongming.model.CheckpointLocation
import com.example.chongming.model.CheckpointVersion
import com.example.chongming.model.CoordinateSystem
import com.example.chongming.ui.theme.ChongmingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckpointDetailScreen(
    checkpoint: CheckpointVersion,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    onAddToRoute: () -> Unit = {},
    onCreateSchedule: () -> Unit = {},
) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = { Text("打卡点详情") },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text("返回") }
                },
            )
        },
    ) { contentPadding ->
        CheckpointDetailContent(
            checkpoint = checkpoint,
            onAddToRoute = onAddToRoute,
            onCreateSchedule = onCreateSchedule,
            modifier = Modifier.padding(contentPadding),
        )
    }
}

@Composable
private fun CheckpointDetailContent(
    checkpoint: CheckpointVersion,
    onAddToRoute: () -> Unit,
    onCreateSchedule: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(modifier = modifier.fillMaxSize()) {
        item {
            Image(
                painter = painterResource(R.drawable.ic_launcher_background),
                contentDescription = checkpoint.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f),
                contentScale = ContentScale.Crop,
            )
        }
        item {
            CheckpointDetailText(checkpoint = checkpoint)
        }
        item {
            CheckpointDetailActions(
                onAddToRoute = onAddToRoute,
                onCreateSchedule = onCreateSchedule,
            )
        }
    }
}

@Composable
private fun CheckpointDetailText(checkpoint: CheckpointVersion) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text(
            text = checkpoint.title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = checkpoint.location.locationName,
            modifier = Modifier.padding(top = 10.dp),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = checkpoint.tagIds.joinToString(" · "),
            modifier = Modifier.padding(top = 6.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))
        Text(text = "打卡点介绍", style = MaterialTheme.typography.titleMedium)
        Text(
            text = checkpoint.shortText,
            modifier = Modifier.padding(top = 8.dp),
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}

@Composable
private fun CheckpointDetailActions(
    onAddToRoute: () -> Unit,
    onCreateSchedule: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        OutlinedButton(onClick = onAddToRoute, modifier = Modifier.weight(1f)) {
            Text("加入路线")
        }
        Button(onClick = onCreateSchedule, modifier = Modifier.weight(1f)) {
            Text("创建安排")
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CheckpointDetailPreview() {
    val checkpoint = CheckpointVersion(
        checkpointId = "preview_checkpoint",
        version = 1,
        location = CheckpointLocation(31.62, 121.93, "东滩观鸟步道", CoordinateSystem.GCJ02),
        title = "藏在东滩芦苇边的观鸟视角",
        shortText = "沿木栈道走到开阔处，适合安静观察湿地鸟类。",
        imageId = "sample/checkpoint_birdwatching",
        tagIds = listOf("湿地", "观鸟", "亲子"),
        publishedAtEpochMillis = 0L,
    )
    ChongmingTheme {
        CheckpointDetailScreen(checkpoint = checkpoint, onBack = {})
    }
}

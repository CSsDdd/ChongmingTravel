package com.example.chongming

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ListItem
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.chongming.model.CheckpointVersion
import com.example.chongming.ui.theme.ChongmingTheme

private const val MAIN_ROUTE = "main"
private const val CHECKPOINT_ID_ARGUMENT = "checkpointId"
private const val VERSION_ARGUMENT = "version"
private const val CHECKPOINT_DETAIL_ROUTE =
    "checkpoint/{$CHECKPOINT_ID_ARGUMENT}/{$VERSION_ARGUMENT}"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { ChongmingTheme { MainScreen() } }
    }
}

private enum class MainTab(val title: String, val symbol: String) {
    DISCOVER("发现", "⌂"),
    LIKE("收藏", "♥"),
    PROFILE("我的", "我"),
    EDIT("编辑", "✎"),
}

@Composable
private fun MainScreen() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = MAIN_ROUTE) {
        composable(MAIN_ROUTE) {
            MainScaffold(
                onCheckpointClick = { checkpoint ->
                    navController.navigate(checkpoint.detailRoute())
                },
            )
        }
        composable(
            route = CHECKPOINT_DETAIL_ROUTE,
            arguments = listOf(
                navArgument(CHECKPOINT_ID_ARGUMENT) { type = NavType.StringType },
                navArgument(VERSION_ARGUMENT) { type = NavType.LongType },
            ),
        ) { backStackEntry ->
            val checkpointId = backStackEntry.arguments
                ?.getString(CHECKPOINT_ID_ARGUMENT)
                .orEmpty()
            val version = backStackEntry.arguments?.getLong(VERSION_ARGUMENT) ?: 0L
            val checkpoint = findSampleCheckpoint(checkpointId, version)

            if (checkpoint != null) {
                CheckpointDetailScreen(
                    checkpoint = checkpoint,
                    onBack = { navController.popBackStack() },
                )
            } else {
                MissingCheckpointScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}

@Composable
private fun MainScaffold(onCheckpointClick: (CheckpointVersion) -> Unit) {
    var selectedIndex by rememberSaveable { mutableIntStateOf(0) }
    val selectedTab = MainTab.entries[selectedIndex]

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            MainNavigationBar(
                selectedIndex = selectedIndex,
                onTabSelected = { selectedIndex = it },
            )
        },
    ) { contentPadding ->
        MainTabContent(
            tab = selectedTab,
            contentPadding = contentPadding,
            onCheckpointClick = onCheckpointClick,
        )
    }
}

@Composable
private fun MainNavigationBar(
    selectedIndex: Int,
    onTabSelected: (Int) -> Unit,
) {
    NavigationBar {
        MainTab.entries.forEachIndexed { index, tab ->
            NavigationBarItem(
                selected = selectedIndex == index,
                onClick = { onTabSelected(index) },
                icon = { Text(tab.symbol) },
                label = { Text(tab.title) },
            )
        }
    }
}

@Composable
private fun MainTabContent(
    tab: MainTab,
    contentPadding: PaddingValues,
    onCheckpointClick: (CheckpointVersion) -> Unit,
) {
    when (tab) {
        MainTab.DISCOVER -> DiscoverScreen(
            contentPadding = contentPadding,
            onCheckpointClick = onCheckpointClick,
        )
        else -> PlaceholderScreen(tab = tab, contentPadding = contentPadding)
    }
}

@Composable
private fun PlaceholderScreen(tab: MainTab, contentPadding: PaddingValues) {
    val rows = List(8) { index -> "${tab.title}页面占位内容 ${index + 1}" }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(rows) { row -> ListItem(headlineContent = { Text(row) }) }
    }
}

@Composable
private fun MissingCheckpointScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("没有找到对应的打卡点版本")
        Button(onClick = onBack) { Text("返回") }
    }
}

private fun CheckpointVersion.detailRoute(): String =
    "checkpoint/$checkpointId/$version"

@Preview(showBackground = true)
@Composable
private fun MainScreenPreview() {
    ChongmingTheme { MainScaffold(onCheckpointClick = {}) }
}

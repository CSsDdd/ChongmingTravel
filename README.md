# ChongmingTravel

崇明户外探索应用原型。仓库同时保存 Android 与微信小程序客户端，二者共享产品设计、数据语义和进度记录。

## 目录结构

```text
ChongmingTravel/
├─ Chongming_Android/  Android / Jetpack Compose 原型
├─ Chongming_Wx/       微信小程序原型
└─ memory/             项目进度记录
```

## 开发方式

- Android：使用 Android Studio 打开 `Chongming_Android`。
- 微信小程序：使用微信开发者工具导入 `Chongming_Wx`。
- 当前 Demo 主要使用 Sample 数据和本地存储，不依赖正式服务端。

## Git 组织方式

两个客户端保留在同一主分支下，通过目录隔离。功能开发可使用短期功能分支，完成后合并回主分支；不使用永久分叉的平台分支。

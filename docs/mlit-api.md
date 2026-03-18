# 国交省API 活用ガイド

DroneMapper では国土交通省が提供する2つのAPIを活用しています。
それぞれの役割・できること・できないことを整理します。

---

## 全体マップ

```
【国交省側】                           【本アプリ側】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  国交省DPF MCP          →  都市・データセットの検索・一覧
  (mlit-dpf-mcp)              ※tileset.json URLは含まれない

  PLATEAU GraphQL API    →  3D Tiles の tileset.json URL 取得
  (api.plateauview.mlit.go.jp)  ← メインの取得手段

  PLATEAU CDN            →  3D Tilesファイルの実配信
  (assets.cms.plateau.reearth.io)  ← CesiumJSが直接読み込む
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 1. 国交省データプラットフォーム MCP（mlit-dpf-mcp）

### 概要
Claude Code 上で動作する MCP（Model Context Protocol）サーバー。
国交省データプラットフォーム（DPF）の GraphQL API をラップし、自然言語で検索できます。

```json
// .mcp.json での設定例
{
  "mcpServers": {
    "mlit-dpf-mcp": {
      "command": ".venv/bin/python",
      "args": ["src/server.py"],
      "env": { "MLIT_DPF_API_KEY": "your_api_key_here" }
    }
  }
}
```

### ✅ できること

#### カタログ・データセット一覧の取得
```
mcp__mlit-dpf-mcp__get_data_catalog_summary
→ 全カタログ一覧（mlit_plateau, nlni_ksj, ngi, ... 36種類）

mcp__mlit-dpf-mcp__get_data_catalog(ids: ["mlit_plateau"])
→ PLATEAUカタログの詳細・データセット一覧
  2024年度: 76都市, 2023年度: 146都市, 2022年度: 81都市...
```

#### PLATEAUデータのメタデータ取得
```
mcp__mlit-dpf-mcp__get_all_data(catalog_id: "mlit_plateau", term: "建物モデル")
→ 各都市の情報:
  - PLT:city     : 都市名（例：台東区）
  - PLT:pref     : 都道府県名
  - PLT:year     : 年度
  - PLT:type     : データ種別（建築物モデル, 交通モデル, etc.）
  - PLT:name     : 利用可能なレイヤ名一覧（LOD別）
  - DPF:latitude : 代表緯度
  - DPF:longitude: 代表経度
  - PLT:url      : CityGML ZIPファイルのURL ← RAWデータ
  - DPF:dataURLs : geospatial.jp CKANページのURL
```

#### 地域・条件による絞り込み検索
```
mcp__mlit-dpf-mcp__get_all_data(
  catalog_id: "mlit_plateau",
  prefecture_code: "13",    // 東京都
  term: ""
)
→ 東京都内の全PLATEAUデータセット一覧
```

#### 周辺施設・インフラデータの検索
```
mcp__mlit-dpf-mcp__search(term: "橋梁", ...)
mcp__mlit-dpf-mcp__search_by_location_point_distance(lat, lon, distance)
→ 飛行エリア付近の橋・道路・施設データを検索
```

### ❌ できないこと・制約

| 制約 | 詳細 |
|------|------|
| **tileset.json URLは含まれない** | PLATEAUメタデータの`PLT:url`はCityGML ZIPファイルのURL。CesiumJSで直接使えるtileset.jsonは別途PLATEAU GraphQL APIで取得する必要がある |
| **リアルタイムデータなし** | DPFのPLATEAUデータは定期更新（年度単位）。リアルタイムの空域情報や気象データは含まれない |
| **飛行申請との連携なし** | DIPS2.0（ドローン情報基盤システム）とは別システム。飛行許可申請はDIPSで行う |
| **建物属性の詳細なし** | DPF上のメタデータは都市・年度・レイヤ種別レベル。建物1棟ごとの属性（高さ・用途）はCityGMLまたは3D Tilesファイル内にある |
| **API呼び出しレート制限** | 大量データ取得時は`max_items`でバッチ制御が必要 |

---

## 2. PLATEAU GraphQL API

### 概要
Project PLATEAUが公式提供するデータカタログ API。
3D Tiles / MVT / CityGML の **実際のファイルURL** を取得できます。

```
エンドポイント: https://api.plateauview.mlit.go.jp/datacatalog/graphql
認証: 不要（公開API）
```

### ✅ できること

#### 都市の3D TilesファイルURL取得
```graphql
{
  area(code: "13106") {  # 市区町村コード（5桁）
    name
    datasets {
      ... on PlateauDataset {
        items {
          name    # "LOD2（テクスチャなし）"
          url     # https://assets.cms.plateau.reearth.io/...tileset.json
          format  # CESIUM3DTILES / MVT
          lod     # 1 / 2 / 3
          texture # true/false
        }
      }
    }
  }
}
```

#### 複数都市の一括取得
```graphql
{
  taito:    area(code: "13106") { ... }
  minato:   area(code: "13103") { ... }
  fukuoka:  area(code: "40130") { ... }
}
```

#### データ種別による絞り込み
取得できるデータ種別（PlateauDatasetのname）：
- 建築物モデル（bldg）
- 交通（道路）モデル（tran）
- 土地利用モデル（luse）
- 洪水浸水想定区域モデル（fld）
- 高潮浸水想定区域モデル（htd）
- 土砂災害警戒区域モデル（lsld）
- 都市計画決定情報モデル（urf）
- 橋梁モデル（brid）
- 植生モデル（veg）
- 都市設備モデル（frn）

### 市区町村コードの探し方
```
総務省の全国市区町村一覧（5桁コード）または
DPF MCP: mcp__mlit-dpf-mcp__normalize_codes で取得可能

主要都市コード例:
  13101 = 千代田区
  13103 = 港区
  13106 = 台東区
  04100 = 仙台市
  27100 = 大阪市
  34100 = 広島市
  40130 = 福岡市
```

### ❌ できないこと・制約

| 制約 | 詳細 |
|------|------|
| **全都市網羅ではない** | PLATEAU整備済み都市のみ。2024年度末時点で約200都市 |
| **整備年度にバラツキ** | 都市によって最新年度が異なる（2020〜2024年度）|
| **LOD3は一部のみ** | LOD3（開口部詳細）は整備コストが高く、沼津市など一部都市のみ |
| **テクスチャありは重い** | テクスチャ付きLOD3はファイルサイズが大きく、ロード時間が長い |
| **属性検索は不可** | 特定高さ以上の建物を検索する、などの属性フィルタはAPI上では不可。3D Tiles内のプロパティをCesiumのスタイリングで条件付けするしかない |
| **建物1棟単位のURL取得は不可** | 1都市分がまとめてひとつのtileset.json（または区ごと） |

---

## 3. PLATEAU 3D Tiles ファイル内の属性

CesiumJSで建物をクリックした際に取得できる属性（`Cesium3DTileFeature.getProperty()`）:

### 建築物モデル（bldg）の主要属性

| 属性名 | 説明 | LOD1 | LOD2 | LOD3 |
|--------|------|------|------|------|
| `gml_id` | GML識別子 | ✅ | ✅ | ✅ |
| `measuredHeight` | 計測高さ（m） | ✅ | ✅ | ✅ |
| `storeysAboveGround` | 地上階数 | △ | ✅ | ✅ |
| `usage` | 建物用途コード | △ | ✅ | ✅ |
| `yearOfConstruction` | 建設年 | △ | △ | △ |
| `name` | 建物名称 | × | △ | △ |
| `description` | 説明 | × | △ | △ |

△: データによって有無が異なる

### 建物用途コード（PLATEAUv3系）

| コード | 用途 |
|--------|------|
| 401 | 専用住宅 |
| 402 | 共同住宅 |
| 411 | 店舗 |
| 413 | 事務所ビル |
| 421 | 学校 |
| 431 | 病院 |
| 441 | ホテル・旅館 |
| 451 | 工場 |
| 461 | 倉庫 |
| 471 | 官公庁 |
| 481 | 神社・寺院・教会 |
| 491 | 駐車場 |

---

## 4. 飛行関連 API（別途連携が必要）

本アプリには含まれていませんが、実運用では以下のAPIとの連携が必要です。

### ドローン飛行申請（DIPS2.0）
```
提供: 国土交通省
URL: https://www.dips.mlit.go.jp/
用途: 飛行許可・承認申請、飛行計画提出
API: 公開APIあり（要申請）
```

### 飛行禁止空域情報
```
提供: 国土交通省（DIPSポータル）
URL: https://www.dips-reg.mlit.go.jp/dips/map/
用途: 空港周辺・緊急用務空域・150m以上規制エリアの確認
API: GeoJSON形式での取得可（一部）
```

### 国土地理院地図API
```
提供: 国土地理院
用途: 標高データ取得（地上高AGL計算の精度向上）
エンドポイント: https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php
```

### 気象情報
```
提供: 気象庁
用途: 飛行日の風速・天候予報
API: 気象庁データAPI（一部無料）
```

---

## 5. 今後の拡張可能性

### DPF MCPで追加できるデータレイヤ

| データ | MCPカタログID | 活用例 |
|--------|--------------|--------|
| 国土数値情報（道路・鉄道） | `nlni_ksj` | 飛行ルート上の障害物チェック |
| 国土地盤情報 | `ngi` | 着陸地点の地盤確認 |
| 道路交通センサス | `rtc` | 飛行エリアの交通量確認 |
| 自然災害伝承碑 | `ndm` | 過去災害リスク参照 |
| GTFSデータ | `gtfs` | バス・電車との接近リスク |
| 歩行空間ナビゲーション | `nvpf` | 住民避難誘導との干渉確認 |

### CesiumJSで追加できる表示

```javascript
// Cesium ion の Assets から追加可能
- 衛星画像レイヤ（Bing Maps / Mapbox）
- 地形データ（Cesium World Terrain）
- 3D建物グローバルデータ（OSM Buildings）
- 気象レイヤ
```

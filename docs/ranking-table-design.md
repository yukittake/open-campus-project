# ランキング用テーブル設計

## 目的

ゲーム終了後に、今回のスコアとランキングを表示できるようにする。

最初の実装では「全期間のスコアランキング」を想定する。ランキング表示に必要な結果サマリだけを保存し、テーブル構成はできるだけシンプルにする。

## 前提

- ゲームは 60 秒制限のナップサック選択ゲーム。
- スコアは選択したアイテムの合計価値。
- 重量上限は 50.0 kg。
- 結果画面では、スコア、重量、評価ランク、選択アイテムを表示している。
- ランキング表示では、上位スコア一覧と自分の順位を表示する。
- 認証なしのゲスト投稿を前提にする。

## テーブル構成

### `ranking_entries`

ランキングに表示する1プレイ分の結果サマリ。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---|---|---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | ランキング結果ID |
| `player_name` | `text` | YES | - | 表示名。未入力の場合は `null` |
| `score` | `integer` | NO | - | 合計価値。ランキングの主な並び順 |
| `total_weight` | `numeric(5,1)` | NO | - | 合計重量 kg |
| `created_at` | `timestamptz` | NO | `now()` | 投稿日時 |

#### 制約

| 制約 | 内容 |
|---|---|
| `score >= 0` | スコアは0以上 |
| `total_weight >= 0 and total_weight <= 50.0` | 重量上限を超えた投稿を防ぐ |
| `player_name is null or char_length(player_name) <= 24` | 表示崩れを防ぐ |

#### インデックス

| インデックス | 用途 |
|---|---|
| `(score desc, created_at asc)` | 全期間ランキングの上位取得 |
| `(created_at desc)` | 最近の投稿確認、管理画面向け |

#### ランキング順位の考え方

基本の並び順:

1. `score desc`
2. `created_at asc`

同点の場合は、先に投稿した結果を上位にする。重量による順位補正は行わない。

## 初期DDL案

```sql
create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  player_name text,
  score integer not null,
  total_weight numeric(5, 1) not null,
  created_at timestamptz not null default now(),

  constraint ranking_entries_player_name_length_check
    check (player_name is null or char_length(player_name) <= 24),
  constraint ranking_entries_score_check
    check (score >= 0),
  constraint ranking_entries_total_weight_check
    check (total_weight >= 0 and total_weight <= 50.0)
);

create index ranking_entries_score_created_at_idx
  on public.ranking_entries (score desc, created_at asc);

create index ranking_entries_created_at_idx
  on public.ranking_entries (created_at desc);

```

## ランキング取得SQL案

上位10件:

```sql
select
  id,
  player_name,
  score,
  total_weight,
  created_at
from public.ranking_entries
order by score desc, created_at asc
limit 10;
```

自分の順位を含めて取得する場合:

```sql
with ranked as (
  select
    id,
    player_name,
    score,
    total_weight,
    created_at,
    rank() over (order by score desc, created_at asc) as rank
  from public.ranking_entries
)
select *
from ranked
where id = :ranking_entry_id;
```

## RLS方針

認証なしでゲスト投稿を受け付けるため、以下の方針にする。

| 操作 | 方針 |
|---|---|
| `select` | 誰でもランキングを閲覧可能 |
| `insert` | 誰でも投稿可能。ただしDB制約とアプリ側バリデーションで最低限チェック |
| `update` | 不許可 |
| `delete` | 不許可。管理者のみ別途許可 |

投稿を完全に信用できないため、最低限のDB制約とアプリ側バリデーションで不正な値を弾く。

## 実装メモ

- 結果画面に入ったタイミングで投稿するか、名前入力後に投稿する。
- プレイヤー名未入力の場合は `null` で保存し、表示側で `Guest` などに置き換える。
- 投稿成功後に返ってきた `ranking_entries.id` を使って、自分の順位を取得する。
- ランキング一覧の表示項目は、順位、名前、スコア、重量、投稿日時を基本にする。

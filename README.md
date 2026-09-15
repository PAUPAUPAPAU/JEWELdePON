# JEWEL de PON v0.9.22

スマホ向けリアルタイム対戦パズル **JEWEL de PON** のオンライン対戦β版です。

## Renderへ公開する

このフォルダの中身を、そのままGitHubリポジトリのルートへアップロードしてください。

Render側では、このリポジトリに含まれる `render.yaml` を使ってBlueprintを作成します。

### GitHubへアップロード

GitHubで空のリポジトリを1つ作成し、このフォルダのファイルをすべてアップロードします。

Gitを使う場合:

```bash
git init
git add .
git commit -m "JEWEL de PON v0.9.22"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

### Render

1. Renderへログイン
2. **New → Blueprint**
3. GitHubを接続
4. JEWEL de PONのリポジトリを選択
5. Blueprint Path は `render.yaml`
6. **Deploy Blueprint**
7. デプロイ完了後、発行された `https://xxxx.onrender.com` を開く

そのURLを対戦相手にも共有してください。

### 遠方の相手との対戦

二人とも同じRender URLへアクセスします。

**プレイヤー1**
- CREATE ROOM
- READY
- 6桁ROOM CODEを相手へ送る

**プレイヤー2**
- JOIN ROOM
- ROOM CODEを入力
- READY

両者READY後、HOSTがSTART MATCHを押します。

## ローカルテスト

Node.js 20以上。

Windowsでは `START_LOCAL.bat` をダブルクリックできます。

または:

```bash
npm start
```

ブラウザ:

```text
http://localhost:8080
```

同じWi-Fiのスマホからは:

```text
http://PCのローカルIP:8080
```

## Health Check

```text
/health
```

Renderのヘルスチェック用です。

## Render設定

- Web Service
- Node.js
- Singapore region
- `npm install --omit=dev`
- `npm start`
- Health Check: `/health`
- Node: 22.22.0
- Room TTL: 6時間

## 現在のオンライン同期

- CREATE / JOIN / ROOM CODE / HOST / READY
- 同期カウントダウン
- 相手盤面プレビュー
- お邪魔攻撃
- FLIP
- DANGER / KO
- PAUSE / RESUME
- 再戦投票
- 同票時HOST優先

## β版の注意

現在のルーム情報はサーバーのメモリ内に保存されています。
Renderが再起動・再デプロイされた場合、進行中のルームは消えます。

また、現状は1サーバーインスタンス前提です。
将来複数インスタンスへスケールする場合は、ルーム状態をRedis等へ移行します。

# 主人公の個別原画

本編23枚のJPEGとは別の原画用ディレクトリです。現在、目視照合済みの個別JPEGは格納されていません。キャラクター画面は各機体の正式なCanvas描画へフォールバックします。

承認・照合後の配置先は `unlock/{id}.jpeg`。IDは `gun, ban, hibari, hana, rin, mogu, koro, sora, rico, yui`。ファイル名のみで割り当てず、形・配色・特徴的な武装を確認し、`design/cinematics_014/character_images.json` に元ファイル・SHA-256・照合済みの状態を登録してから `build_cinematic_data.py` を再実行します。

本編の集合画から切り出したものを、承認された個別原画として登録しません。名前・役割・モットーは `ArcCharacters`、能力と所有はゲームの実データを参照します。

2026-11-01追記：候補PNG10枚が元のファイル名と `unlock/unverified/` に保存されました（main `b9d718a`）。機体との目視対応と採用表の登録は未確認。対応が確定するまではCanvas表示を継続します。検収時には元PNGを保持し、再圧縮を必須にせず、実ファイルのパスとハッシュを登録できます。

# 主人公の個別原画

本編23枚のJPEGとは別の原画用ディレクトリです。現在、目視照合済みの個別JPEGは格納されていません。キャラクター画面は各機体の正式なCanvas描画へフォールバックします。

承認・照合後の配置先は `unlock/{id}.jpeg`。IDは `gun, ban, hibari, hana, rin, mogu, koro, sora, rico, yui`。ファイル名のみで割り当てず、形・配色・特徴的な武装を確認し、`design/cinematics_014/character_images.json` に元ファイル・SHA-256・照合済みの状態を登録してから `build_cinematic_data.py` を再実行します。

本編の集合画から切り出したものを、承認された個別原画として登録しません。名前・役割・モットーは `ArcCharacters`、能力と所有はゲームの実データを参照します。

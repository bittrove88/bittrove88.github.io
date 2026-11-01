# 主人公の個別原画

個別原画10枚を `unlock/{id}.png` に整理しました。すべて1672×941のPNGです。画像の再生成・再圧縮・切り抜きは行わず、アップロードされたバイト列を保持しています。元のUUID名の原画はこのディレクトリ直下に保存しています。

## 目視照合した対応

`game/dist/characters.js` の機体ID・配色と、`design/sheets/DESIGN_UNIFICATION_PLAN_JA.md` の形状・装備を画像と照合しました。ファイルの並び順から割り当てていません。

| ID | 名前 | 整理後 | 元ファイル | 照合した特徴 |
|---|---|---|---|---|
| `gun` | ガン | [unlock/gun.png](unlock/gun.png) | [69A445CC-631A-4A74-A2AB-1F06AEA7EA99.png](69A445CC-631A-4A74-A2AB-1F06AEA7EA99.png) | 橙・クリームの重装履帯車体と太い主砲 |
| `ban` | バン | [unlock/ban.png](unlock/ban.png) | [C1FCFFF4-9BA7-4B74-A5FE-DEF4EEF6D31B.png](C1FCFFF4-9BA7-4B74-A5FE-DEF4EEF6D31B.png) | 赤い楔形装甲と後部フィン、突進型の主砲 |
| `hibari` | ヒバリ | [unlock/hibari.png](unlock/hibari.png) | [AAAA67D7-C49F-439A-A658-6192D871AA3A.png](AAAA67D7-C49F-439A-A658-6192D871AA3A.png) | 青緑・黄の長いセンサーフィンと観測頭部 |
| `hana` | ハナ | [unlock/hana.png](unlock/hana.png) | [78AE5BB6-0349-42DE-8117-0C363ED9525C.png](78AE5BB6-0349-42DE-8117-0C363ED9525C.png) | ピンク・クリームの装甲、花模様と三連装砲 |
| `rin` | リン | [unlock/rin.png](unlock/rin.png) | [53404E69-D635-4853-A671-41463DFE6F6E.png](53404E69-D635-4853-A671-41463DFE6F6E.png) | 紫の低い車体と細長い狙撃砲、アンテナ |
| `mogu` | モグ | [unlock/mogu.png](unlock/mogu.png) | [03C30A41-D5F8-4AB9-94AD-4C3586F0F11F.png](03C30A41-D5F8-4AB9-94AD-4C3586F0F11F.png) | 黄色い作業機体と側面の大きな円盤切削機構 |
| `koro` | コロ | [unlock/koro.png](unlock/koro.png) | [DE47956B-6517-4E44-9808-BCB83A2D9C0D.png](DE47956B-6517-4E44-9808-BCB83A2D9C0D.png) | 黄緑・クリームの六輪ローバーと多孔砲口 |
| `sora` | ソラ | [unlock/sora.png](unlock/sora.png) | [BB0CC583-327B-45F7-8354-82E46E0948FD.png](BB0CC583-327B-45F7-8354-82E46E0948FD.png) | 青・クリームの車体と上向きの大型迫撃砲 |
| `rico` | リコ | [unlock/rico.png](unlock/rico.png) | [6AA3B104-60A5-4C30-AA2F-3A02FF5681EB.png](6AA3B104-60A5-4C30-AA2F-3A02FF5681EB.png) | マゼンタの低い車体と黄緑の差し色、鋭い後部フィン |
| `yui` | ユイ | [unlock/yui.png](unlock/yui.png) | [A9C44CC2-8B71-4FD3-BB4E-6EC68036FE8B.png](A9C44CC2-8B71-4FD3-BB4E-6EC68036FE8B.png) | ミント色の円環・支持腕と中央の発光レンズ |

## SHA-256

整理後の各PNGは、対応する元ファイルおよび移動前の `unlock/unverified/` の画像と完全一致します。

| ファイル | SHA-256 |
|---|---|
| `gun.png` | `54b6a6aebe917aa5adab33cd8b09fed91c24c30ee2cd18e5a323d5e93e9e9c0f` |
| `ban.png` | `5ba72b0c8a7b40308f8035a2c0e674451162716d6b10d27fd951e13bc131b8b3` |
| `hibari.png` | `8aebfb5d4c8c66eb5cfb0ab2fb690307c33c32dbe2074acb8603e70091ea6e49` |
| `hana.png` | `64593b2e33b9bc482535a3714a6d07b131d02560736d38116c93763b526b02a0` |
| `rin.png` | `e2d676c9e9c768b2fd4a89fd0a1d1bb0a3a124752476893312800561efbb13e9` |
| `mogu.png` | `fb2cd75ad56ddcf2ad55a137e35be688f721af76528c29138fdf54b60c2f87e1` |
| `koro.png` | `98ec9346642b3d9a23470bb72f51d1be78348ff1be188320adaf0504fe58f24e` |
| `sora.png` | `7e839c32f6507766eec8e7e365eba796c8cb6b82e866de67e0ca543af7a6c19d` |
| `rico.png` | `8da2cb2370e28d30f41fc7123592c9253c88341f57c89e9421b62facc5610ac0` |
| `yui.png` | `3c75ecb9675a162370c669e5d753fcb4645113d56189ddd70521db8c7b74b37e` |

## 表示用データへの接続

0.14.2で表示用の `design/cinematics_014/character_images.json` に10枚のPNGパス、元ファイル名、SHA-256、寸法、目視照合記録と被写体の保護領域を登録しました。ゲームの詳細・加入・公開キャラ画面へ接続済みです。読み込み中・失敗時とオフラインHTMLは、正しい機体のCanvas表示を使います。

名前・役割・モットーは `ArcCharacters`、能力と所有はゲームの実データを参照します。集合画からの切り出しを個別原画として登録しません。

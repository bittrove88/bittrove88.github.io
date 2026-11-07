# 画像制作アートバイブル・一枚絵生成プロンプト

## 参照画像の役割
- **Image A: 旧10キャラ一覧**：1〜100面のイラスト。輪郭線、セル塗り、メカデフォルメ、公式資料風レイアウトのみ参照。
- **Image B: ユーザー制作のARC原画**：主人公ARCの丸い4輪車体、大きなシアン単眼、ウィング、上部砲塔、サイズ感の**構造上の最優先基準**。
- **Image C: 最終FIXの12ジョブラインナップ**：同じARCが12種類の装備に着替えたビジュアル方向の基準。生成日本語の誤字・技効果の間違いは正式仕様にしない。

## 出力構成
- **一枚の大判横長画像**。ニュートラルARCを左側などで大きく示し、12ジョブを**4列×3段**に配置。
- 明るいオフホワイト背景、濃紺のARCLINEロゴ、細い区切り線、親しみやすい高品質2Dセル塗り。
- 各枠は**ジョブ名＋ジョブ技・必殺技を統合した短い特徴文**だけ。技名・必殺技名の独立欄、外観説明、HEXコードを印字しない。
- 4輪・単眼・主砲基部は揃え、車体サイズの大幅変更禁止。ウィング、砲身外装、兜・帽子、背面ユニットの着せ替えは大胆に。
- 通常立ち絵とし、弾丸、ビーム、炎、爆発、オーラ、召喚ユニット、分身など**戦闘エフェクトは描かない**。
- 別々の戦車12台、人間の手足や表情を持つ人型ロボットにはしない。

## 最新FIXの例外
**メカニック:** 黄→柔らかい**緑**。やさしく親しみのある整備ウェア、丸い装甲と修理装置。
**ウォーリアー:** 赤→鮮やかな**オレンジ**。斧刃モチーフをウィング／砲塔の装甲に組み込む。手持ち斧ではない。
**シーフ:** 小型**シーフ帽**、モノクル解析レンズ、鍵の小物、ツールケース。大型回収アームなし。

## コピペ用英語プロンプト
> Create one large landscape Japanese game artbook infographic for ARCLINE: a large neutral protagonist ARC and exactly 12 JOB OUTFIT forms in a 4-column by 3-row grid. Image A (old ten-character lineup) defines art style and editorial layout only. Image B (user-provided original ARC) strictly defines the base character anatomy: an oversized round expressive CYAN mono-eye, compact rounded FOUR-WHEEL chassis, small side wings, top cannon mount, and consistent body scale. Image C is the FIXED final 12-job costume concept reference. These are NOT twelve different machines but the SAME lovable ARC changing into 12 job-themed outfits, reminiscent of holo-wear. Alter cannon jackets, wing armor, costume hats, side panels, small equipment and colors while keeping four wheels and face recognizable. Exaggerate one iconic piece on each form to make every job lovable and readable at small size. Friendly crisp cel-shaded Japanese mecha with precise mechanical joints, bright ivory background, navy titles and neat column separators. Each tile has ONLY the Japanese job name and exact short feature text from JOB_CATALOG.md; do not print design instructions, palette codes or separate skill/ultimate headings. Show ordinary resting full-body vehicles, consistent perspective and size, no fighting, explosions, bullets, lasers, flames, ghosts, auras, humanoid anatomy, duplicates or missing jobs. Especially: MECHANIC is SOFT GREEN and gentle with tidy repair gear; WARRIOR is vivid ORANGE with AXE-BLADE wing/armor motifs; THIEF wears a small THIEF HAT and monocle/lockpicking case, NO recovery arm. The remaining nine forms follow the detailed catalog. Proofread Japanese carefully.

## 12ジョブ掲載用テキスト
- **J01 レンジャー**: 着弾地点へ転移して射点を変え、連続爆破で地形を切り開く。機動力と突破力を兼ね備えた戦闘型。
- **J02 アサシン**: 近距離テレポートで一気に間合いを詰め、集中砲撃で狙った敵を撃ち抜く。奇襲と精密攻撃が得意。
- **J03 トリックスター**: 敵と位置を入れ替えて戦況を乱し、分身たちの一斉砲撃で多方向から攻める。予測不能な攪乱型。
- **J04 サイキッカー**: 垂直浮遊で射点の高さを変え、重力弾で敵を打ち上げて叩き落とす。高低差と重力を操る特殊型。
- **J05 ナイト**: 堅牢なバリアで敵の攻撃を防ぎ、前方衝撃波で相手を押し返す。戦線を守る重装防御型。
- **J06 サムライ**: 敵の攻撃に反応して撃ち返し、貫通レール砲で一直線に敵を貫く。反撃と鋭い一撃の迎撃型。
- **J07 メカニック**: 自機を修復して戦い続け、自動追尾弾で動く敵も狙う。整備技術と継戦能力を備えたやさしい支援型。
- **J08 ボマー**: 毒弾で敵を侵食し、ナパーム爆撃で地表に炎を広げる。継続ダメージと広域攻撃が得意な爆撃型。
- **J09 ネクロマンサー**: HP吸収弾で敵の力を奪い、亡霊型ユニットを召喚して包囲攻撃する。吸収と召喚の特殊戦闘型。
- **J10 ウィザード**: 弱体化弾で敵の能力を下げ、散開した魔弾を一点へ収束させて攻撃する。特殊弾道を操る技巧型。
- **J11 ウォーリアー**: 強化弾で自らの火力を高め、旋回連続砲撃で広範囲を薙ぎ払う。正面突破を得意とする攻撃型。
- **J12 シーフ**: 命中させた敵の必殺技を奪い、反射するほど強くなる弾で攻める。相手を利用して戦う変則型。

## 主なアイキャッチ
レンジャー：大型望遠センサー。アサシン：黒いバイザー。トリックスター：非対称ウィング。サイキッカー：半月フィン。ナイト：盾ウィング。サムライ：V字兜飾り。メカニック：優しい緑＋C字修理クランプ。ボマー：六連弾倉。ネクロマンサー：小型棺型ポッド。ウィザード：帽子＋天球儀リング。ウォーリアー：オレンジ＋斧刃。シーフ：シーフ帽＋解析レンズ。

## 日本語の注意
画像の文字組は生成AIで誤植することがある。出力がFIXでも**文章はカタログを正本として校正・修正**する。
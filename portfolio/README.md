# Hayato Uchida Portfolio

公開URL: `https://bittrove88.github.io/portfolio/`

移行元: https://ihcu.my.canva.site/

参照資料: ユーザー提供の「ホーム.pdf」（全15ページ）

移行日: 2026-10-22

## 構成・更新

- `index.html`: プロフィール、Works、AI Works、AI Creative。各 `data-source-page` は参照PDFのページ番号。
- `style.css`: PC・タブレット・スマートフォンのレイアウト。
- `assets/`: PDFから抽出した全47画像のWebP版、プロフィールページを使ったOGP画像、favicon。

文章とリンクはHTMLで編集し、画像はassetsに配置します。ビルドや外部JavaScript、Canvaランタイム、外部フォントは不要。`main` へのプッシュでGitHub Pagesに公開されます。ルートの空白ページは維持し、ポートフォリオは `/catalog/` に掲載しています。

元のクリーム色・青・グレーの配色と全15ページの掲載内容を引き継ぎ、スマートフォンでは読みやすい順番に再配置しています。PDFにある英語プロンプトは「制作時のプロンプトを見る」で全文を開けます。StoryMakerやUNITEの掲載画像は元資料の静止画です。

Web版では一部がリンクになっていなかったため、PDFのリンク注釈から記事・GPTsの遷移を復元。Treasure Data等に重なっていた無関係な注釈は除外し、ラベルに対応するURLを使用しています。UNITEの旧独自ドメインは `/unite-roulette/` に更新。元Canvaサイトは変更していません。元サイトに計測設定は確認されず、この移行ではGA4を追加していません。

## 表示確認

リポジトリのルートで `python3 -m http.server 8000` を起動し、http://localhost:8000/portfolio/ を開きます。幅1440・768・390・320pxで本文、画像、リンク、プロンプトの開閉を確認してください。

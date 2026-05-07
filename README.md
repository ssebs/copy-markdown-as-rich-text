# Copy Markdown as Rich Text

A VSCode extension that converts selected markdown text to rich text and copies it to the clipboard so it can be pasted as formatted text into applications like Google Docs, Word, etc.

> Sorry, this is a vibe-coded app. I just wanted the feature 🤷‍♀️

## Install

<!-- - [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=SebastianSafari.copy-markdown-as-rich-text)
- [Open-VSX Marketplace](https://open-vsx.org/extension/SebastianSafari/copy-markdown-as-rich-text) -->

## Usage

TBD

## Building

## Local

- `npm install`
- `npm watch`
  - Then, hit F5 to debug.

### Publishing

- Confirm everything is working & compiles
- Update version in [package.json](./package.json) (e.g. "0.0.3")
- `vsce package`
- `export v='v0.0.4'; git add -A; git commit -m "$v release"; git push; git tag $v; git push origin $v;`
  - PS: `$v = "v0.0.4"; git add -A; git commit -m "$v release"; git push; git tag $v; git push origin $v`
- [Github Actions](./.github/workflows/main.yml) are configured to build & publish when a new tag is created, so on sucess it will auto publish
  - These use auth token repo secrets to push to both extension galleries.

## LICENSE

[Apache v2](https://raw.githubusercontent.com/ssebs/copy-markdown-as-rich-text/main/LICENSE)

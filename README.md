# Canvas Bulk Uploader

A Chrome extension that lets you select files from multiple folders and upload them all at once to a Canvas assignment - no more clicking "Add Another File" over and over again.

## Features

- Select files from multiple folders
- Drag and drop support
- Automatically fills Canvas attachment slots, adding new ones as needed
- Syncs with Canvas on upload: removes files you've removed, skips files already uploaded
- Duplicate detection - won't add the same file twice
- Clear All refreshes the page for a clean slate
- Draggable, collapsible panel that stays on screen

## Installation

This extension is not on the Chrome Web Store. You load it manually in developer mode - it takes about 3 minutes.

1. Download the ZIP from this repo and unzip it
2. Open Chrome and go to `chrome://extensions`
3. Toggle **Developer mode** on (top-right corner)
4. Click **Load unpacked** (top-left corner)
5. Select the unzipped `canvas-bulk-uploader` folder
6. Then you're set to go!

To update when a new version is released, replace the folder contents and click the **↻** refresh icon on the extension card at `chrome://extensions`.

## Usage

1. Navigate to a Canvas assignment page
2. The **Canvas Bulk Uploader** panel appears in the bottom-right corner
3. Click the drop zone (or drag files onto it) to add files - repeat from different folders as needed
4. Remove individual files with the **×** button, or hit **Clear All** to start over
5. Click **Bulk Upload** - the extension fills all Canvas slots automatically
6. Review the files in Canvas and hit **Submit Assignment** as normal

## Compatibility

Works on `*.instructure.com` (the platform that powers most Canvas installations). If your school uses a custom Canvas domain, open `manifest.json` and add your domain to the `matches` array:

```json
"*://canvas.yourschool.edu/courses/*/assignments/*"
```

> Note: By default, this extension is compaitable with Brigham Young University's version of Canvas.

Then reload the extension at `chrome://extensions`.

## Disclaimer

This is an unofficial third-party tool, not affiliated with or endorsed by Instructure or Canvas LMS or Brigham Young University. It interacts with Canvas's submission form the same way a user would - no private APIs or credentials are accessed. Use at your own discretion.

## License

MIT - free to use, modify, and share.

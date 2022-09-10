# alexa-presentation-language-preview

VSCode extension for previewing APL document
https://marketplace.visualstudio.com/items?itemName=YoshiakiYamada.alexa-presentation-language-preview

## What is it

This extension is for previewing the doument that is written by Amazon Presentation Language (APL).

This extension supports live preview updating. So you can edit and check APL easily.

## How to use it

Open APL document json file on the VSCode, then call `Preview Amazon Presentation Language` command.

You can change viewport size by selecting viewport on the status bar.

### Refresh preview

APL Preview will refresh each time when you save json file. So if you want to debug `onMount` or other commands which are called when show the document, just save json file again.

### APL Document component tree

You can see `APL DOCUMENT TREE` and `APL COMPONENT DETAILS` tree view in `EXPLORER` tab.
`APL DOCUMENT TREE` shows component structure of the document. And `APL COMPONENT DETAILS` shows properties of the component you selected on the `APL DOCUMENT TREE`

https://user-images.githubusercontent.com/5585662/188664431-2fd20a90-ca6a-43d9-8565-434e7da7ea24.mp4

### Local package import

This extension supports to import APL package from local directory.

If you don't know about APL package, please read this document at first.
https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-package.html

You can import APL package from local directory by setting path to `source` property.
For example, extension will import `your-own-package` from `./your-own-package.json`. You can set full path for source also.

```json
{
  "import": [
    {
      "name": "your-own-package",
      "source": "./your-own-package.json",
      "version": "1.0"
    },
    {
      "name": "alexa-layouts",
      "version": "1.5.0"
    }
  ]
}
```

This is the detail document of `import` section.
https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-document.html#import

Extension just read file contents and integrate to original APL json file. So it may not same as actual `import` mechanism of APL. Please remain it if something happens.

## Demo

<img src="usage.gif" width="100%">

## Future works

- GUI editor
- Create new document command

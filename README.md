# alexa-presentation-language-preview

VSCode extension for previewing APL document
https://marketplace.visualstudio.com/items?itemName=YoshiakiYamada.alexa-presentation-language-preview

## What is it

This extension is for previewing the doument that is written by Amazon Presentation Language (APL).

This extension supports live preview updating. So you can edit and check APL easily.

## How to use it

Open APL document json file on the VSCode, then call `Preview Amazon Presentation Language` command.

You can change viewport size by selecting viewport on the status bar.

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

- Introduce APL Suggester
- Reload button
- GUI editor
- Introduce Vitest

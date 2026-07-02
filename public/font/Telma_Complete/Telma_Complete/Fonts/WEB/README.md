# Installing Webfonts
Follow these simple Steps.

## 1.
Put `telma/` Folder into a Folder called `fonts/`.

## 2.
Put `telma.css` into your `css/` Folder.

## 3. (Optional)
You may adapt the `url('path')` in `telma.css` depends on your Website Filesystem.

## 4.
Import `telma.css` at the top of you main Stylesheet.

```
@import url('telma.css');
```

## 5.
You are now ready to use the following Rules in your CSS to specify each Font Style:
```
font-family: Telma-Light;
font-family: Telma-Regular;
font-family: Telma-Medium;
font-family: Telma-Bold;
font-family: Telma-Black;
font-family: Telma-Variable;

```
## 6. (Optional)
Use `font-variation-settings` rule to controll axes of variable fonts:
wght 900.0

Available axes:
'wght' (range from 300.0 to 900.0


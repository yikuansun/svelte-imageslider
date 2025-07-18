# svelte-imageslider
A before/after image slider component for Svelte. Great for juxtaposing images.

![Demo Image](./demo.png)

## Install
```npm install svelte-imageslider```

## Use
```javascript
// Import the component in your <script> tag
import ImageSlider from "svelte-imageslider";

<!-- Insert the component into your page -->
<ImageSlider
    src1={imageBefore}
    src2={imageAfter}
    caption1="Before"
    caption2="After" />
```

## Options

These are the parameters you can pass to the component as props.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `src1` **(required)** | string | | URL of the "before" image (left of separator) |
| `src2` **(required)** | string | | URL of the "after" image (right of separator) |
| `caption1` (optional) | string | | Left side caption |
| `caption2` (optional) | string | | Right side caption |
| `separatorWidth` (optional) | number | 4 | Separator width, in pixels |
| `separatorColor` (optional) | string | "white" | Separator color. Can be any CSS color |
| `handleType` (optional) | string | "none" | Handle icon type. Can be "none", "arrows", "circle", or "triangles" |
| `handleSize` (optional) | number | 42 | Handle icon size, in pixels |
| `sliderPercent` (optional) | number | 50 | Separator position, as a percentage (0 to 100). Can be set by the user. |
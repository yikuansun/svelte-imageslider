# svelte-imageslider
A before/after image slider component for Svelte.
## Install
```npm install svelte-imageslider```
## Use
```
import ImageSlider from "svelte-imageslider";

<ImageSlider src1={imageBefore} src2={imageAfter} caption1="Before" caption2="After"></ImageSlider>
```
src1 and src2 should be valid URLs to images (should be same aspect ratio). caption1 and caption2 are optional.
<script>
    import { onMount } from "svelte";

    let sliderPercent = 50;

    onMount(() => {
    });

    export let src1;
    export let src2;

    export let caption1 = "";
    export let caption2 = "";

    export let separatorWidth = 4;
    export let separatorColor = "white";

    /** @type {HTMLDivElement} */
    let invisibleCover;

    let dragging = false;
    function handleDrag(e) {
        sliderPercent = (e.pageX - invisibleCover.getBoundingClientRect().x) / invisibleCover.getBoundingClientRect().width * 100;
        sliderPercent = Math.min(Math.max(sliderPercent, 0), 100);
    }
</script>

<svelte:document
    on:mousemove={(e) => {
        if (dragging) handleDrag(e);
    }}
    on:mouseup={() => {
        dragging = false;
    }} />

<div class="imageSlider">
    <div style="">
        <img src={src1} alt="before" style:width="100%" draggable={false} />
    </div>
    <div style:position="absolute" style:top="0" style:right="0" style:height="100%" style:overflow-x="hidden"
        style:width="calc({100 - sliderPercent}% - {separatorWidth / 2}px)" style:border-left="{separatorWidth}px solid {separatorColor}" style:transition="width 0.1s"
        style:max-width="calc(100% - {separatorWidth}px)" style:min-width="0">
        <img src={src2} alt="after" style:height="100%" style:float="right" draggable={false} />
    </div>
    {#if caption1}<span class="imageLabel" style:left="0">{caption1}</span>{/if}
    {#if caption2}<span class="imageLabel" style:right="0">{caption2}</span>{/if}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="invisibleCover" bind:this={invisibleCover}
        on:mousedown={(e) => {
            e.preventDefault();
            dragging = true;
            handleDrag(e);
        }}
        style:cursor={dragging?"ew-resize":"pointer"}>
    </div>
</div>

<!--
Before -
<input type="range" min={0} max={100} bind:value={sliderPercent} />
- After
-->

<style>
    .imageSlider {
        display: inline-block;
        width: 100%;
        position: relative;
    }

    .imageSlider img {
        display: block;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
    }

    .imageSlider .invisibleCover {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .imageSlider .imageLabel {
        position: absolute;
        bottom: 0;
        padding: 8px;
        background-color: rgba(0, 0, 0, 42%);
        color: white;
        font-size: 12px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
</style>
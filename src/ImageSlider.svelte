<script>
    import { onMount } from "svelte";

    let sliderPercent = 50;

    onMount(() => {
    });

    export let src1;
    export let src2;

    export let caption1 = "";
    export let caption2 = "";

    let dragging = false;
    function handleDrag(e) {
        sliderPercent = (e.pageX - e.target.getBoundingClientRect().x) / e.target.getBoundingClientRect().width * 100;
        sliderPercent = Math.min(Math.max(sliderPercent, 0), 100);
    }

    function globalMousemove(node) {
        const handleEvt = (e) => {
            node.dispatchEvent(new MouseEvent('gmousemove', e));
        };

        document.addEventListener("mousemove", handleEvt, true);

        return {
            destroy() {
                document.removeEventListener("mousemove", handleEvt, true);
            }
        };
    }

    function globalMouseup(node) {
        const handleEvt = (e) => {
            node.dispatchEvent(new MouseEvent('gmouseup', e));
        };

        document.addEventListener("mouseup", handleEvt, true);

        return {
            destroy() {
                document.removeEventListener("mouseup", handleEvt, true);
            }
        };
    }
</script>

<div class="imageSlider">
    <div style="">
        <img src={src1} alt="before" style:width="100%" draggable={false} />
    </div>
    <div style:position="absolute" style:top="0" style:right="0" style:height="100%" style:overflow-x="hidden"
        style:width="{100 - sliderPercent}%" style:border-left="4px solid white" style:transition="width 0.1s">
        <img src={src2} alt="after" style:height="100%" style:float="right" draggable={false} />
    </div>
    {#if caption1}<span class="imageLabel" style:left="0">{caption1}</span>{/if}
    {#if caption2}<span class="imageLabel" style:right="0">{caption2}</span>{/if}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="invisibleCover" on:mousedown={(e) => {
            e.preventDefault();
            dragging = true;
            handleDrag(e);
        }} use:globalMousemove use:globalMouseup
        on:gmousemove={(e) => {
            e.preventDefault();
            if (dragging) handleDrag(e);
        }} on:gmouseup={() => {
            dragging = false;
        }} style:cursor={dragging?"ew-resize":"pointer"}>
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
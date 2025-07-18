<script>
    /** Separator position, as a percentage (0 to 100). Can be set by the user. */
    export let sliderPercent = 50;

    /** @type {string} URL of the "before" image (left of separator). */
    export let src1;
    /** @type {string} URL of the "after" image (right of separator). */
    export let src2;

    /** Left side caption. */
    export let caption1 = "";
    /** Right side caption. */
    export let caption2 = "";

    /** Separator width, in pixels. */
    export let separatorWidth = 4;
    /** Separator color. Can be any CSS color. */
    export let separatorColor = "white";

    /** @type {"none" | "arrows" | "circle" | "triangles"} Handle icon type. */
    export let handleType = "none";
    /** Handle icon size, in pixels. */
    export let handleSize = 42;

    /** @type {HTMLDivElement} */
    let invisibleCover;

    /** Whether the user is currently dragging the slider. Used for svelte:document event listeners. */
    let dragging = false;
    /**
     * Calculate slider percent based on mouse position.
     * @param {MouseEvent} e
     */
    function handleDrag(e) {
        sliderPercent = (e.pageX - invisibleCover.getBoundingClientRect().x) / invisibleCover.getBoundingClientRect().width * 100;
        sliderPercent = Math.min(Math.max(sliderPercent, 0), 100);
    }
    /**
     * Calculate slider percent based on touch position.
     * @param {TouchEvent} e
     */
    function handleMobileDrag(e) {
        sliderPercent = (e.touches[0].pageX - invisibleCover.getBoundingClientRect().x) / invisibleCover.getBoundingClientRect().width * 100;
        sliderPercent = Math.min(Math.max(sliderPercent, 0), 100);
    }
</script>

<svelte:document
    on:mousemove={(e) => {
        if (dragging) handleDrag(e);
    }}
    on:mouseup={() => {
        dragging = false;
    }}
    on:touchmove={(e) => {
        if (dragging) handleMobileDrag(e);
    }}
    on:touchend={() => {
        dragging = false;
    }}
/>

<div class="imageSlider">
    <div>
        <!-- Before image (left of separator) -->
        <img src={src1} alt="before" style:width="100%" draggable={false} />
    </div>
    <div style:position="absolute" style:top="0" style:right="0" style:height="100%" style:overflow-x="hidden"
        style:width="calc({100 - sliderPercent}% - {separatorWidth / 2}px)" style:border-left="{separatorWidth}px solid {separatorColor}" style:transition="width 0.1s"
        style:max-width="calc(100% - {separatorWidth}px)" style:min-width="0">
        <!-- After image (right of separator) -->
        <img src={src2} alt="after" style:height="100%" style:float="right" draggable={false} />
    </div>

    <!-- Captions -->
    {#if caption1}<span class="imageLabel" style:left="0">{caption1}</span>{/if}
    {#if caption2}<span class="imageLabel" style:right="0">{caption2}</span>{/if}

    <!-- Handle -->
    <div style:position="absolute" style:top="50%" style:left="{sliderPercent}%"
        style:width="{handleSize}px" style:height="{handleSize}px" style:transform="translate(-50%, -50%)"
        style:transition="left 0.1s">
        {#if handleType === "triangles"}
            <svg style:width="100%" style:height="100%" viewBox="0 0 100 100">
                <polygon points="30,20 0,50 30,80" style:fill={separatorColor} />
                <polygon points="70,20 100,50 70,80" style:fill={separatorColor} />
            </svg>
        {:else if handleType === "circle"}
            <svg style:width="100%" style:height="100%" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" style:fill="transparent" style:stroke={separatorColor} style:stroke-width="7" />
                <polygon points="30,40 20,50 30,60" style:fill={separatorColor} />
                <polygon points="70,40 80,50 70,60" style:fill={separatorColor} />
            </svg>
        {:else if handleType === "arrows"}
            <svg style:width="100%" style:height="100%" viewBox="0 0 100 100">
                <line x1="10" y1="50" x2="30" y2="30" style:stroke={separatorColor} style:stroke-width="7" />
                <line x1="10" y1="50" x2="30" y2="70" style:stroke={separatorColor} style:stroke-width="7" />
                <circle cx="10" cy="50" r="3.5" style:fill={separatorColor} />
                <line x1="90" y1="50" x2="70" y2="30" style:stroke={separatorColor} style:stroke-width="7" />
                <line x1="90" y1="50" x2="70" y2="70" style:stroke={separatorColor} style:stroke-width="7" />
                <circle cx="90" cy="50" r="3.5" style:fill={separatorColor} />
            </svg>
        {/if}
    </div>

    <!-- Invisible cover for dragging -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="invisibleCover" bind:this={invisibleCover}
        on:mousedown={(e) => {
            e.preventDefault();
            dragging = true;
            handleDrag(e);
        }}
        on:touchstart={(e) => {
            e.preventDefault();
            dragging = true;
            handleMobileDrag(e);
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
        overflow-x: hidden;
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
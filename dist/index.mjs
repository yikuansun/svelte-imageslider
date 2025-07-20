/** @returns {void} */
function noop() {}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

let src_url_equal_anchor;

/**
 * @param {string} element_src
 * @param {string} url
 * @returns {boolean}
 */
function src_url_equal(element_src, url) {
	if (element_src === url) return true;
	if (!src_url_equal_anchor) {
		src_url_equal_anchor = document.createElement('a');
	}
	// This is actually faster than doing URL(..).href
	src_url_equal_anchor.href = url;
	return element_src === src_url_equal_anchor.href;
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {string} style_sheet_id
 * @param {string} styles
 * @returns {void}
 */
function append_styles(target, style_sheet_id, styles) {
	const append_styles_to = get_root_for_style(target);
	if (!append_styles_to.getElementById(style_sheet_id)) {
		const style = element('style');
		style.id = style_sheet_id;
		style.textContent = styles;
		append_stylesheet(append_styles_to, style);
	}
}

/**
 * @param {Node} node
 * @returns {ShadowRoot | Document}
 */
function get_root_for_style(node) {
	if (!node) return document;
	const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
	if (root && /** @type {ShadowRoot} */ (root).host) {
		return /** @type {ShadowRoot} */ (root);
	}
	return node.ownerDocument;
}

/**
 * @param {ShadowRoot | Document} node
 * @param {HTMLStyleElement} style
 * @returns {CSSStyleSheet}
 */
function append_stylesheet(node, style) {
	append(/** @type {Document} */ (node).head || node, style);
	return style.sheet;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name
 * @returns {SVGElement}
 */
function svg_element(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
function set_data(text, data) {
	data = '' + data;
	if (text.data === data) return;
	text.data = /** @type {string} */ (data);
}

/**
 * @returns {void} */
function set_style(node, key, value, important) {
	if (value == null) {
		node.style.removeProperty(key);
	} else {
		node.style.setProperty(key, value, '');
	}
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

// TODO: Document the other params
/**
 * @param {SvelteComponent} component
 * @param {import('./public.js').ComponentConstructorOptions} options
 *
 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
 * This will be the `add_css` function from the compiled component.
 *
 * @returns {void}
 */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles = null,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			// TODO: what is the correct type here?
			// @ts-expect-error
			const nodes = children(options.target);
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

const PUBLIC_VERSION = '4';

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

/* src/ImageSlider.svelte generated by Svelte v4.2.18 */

function add_css(target) {
	append_styles(target, "svelte-1g2ovuy", ".imageSlider.svelte-1g2ovuy.svelte-1g2ovuy{display:inline-block;width:100%;position:relative;overflow-x:hidden}.imageSlider.svelte-1g2ovuy img.svelte-1g2ovuy{display:block;user-select:none;-moz-user-select:none;-webkit-user-select:none;-webkit-user-drag:none}.imageSlider.svelte-1g2ovuy .invisibleCover.svelte-1g2ovuy{position:absolute;top:0;left:0;width:100%;height:100%}.imageSlider.svelte-1g2ovuy .imageLabel.svelte-1g2ovuy{position:absolute;bottom:0;padding:8px;background-color:rgba(0, 0, 0, 42%);color:white;font-size:12px;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif}");
}

// (79:4) {#if caption1}
function create_if_block_4(ctx) {
	let span;
	let t;

	return {
		c() {
			span = element("span");
			t = text(/*caption1*/ ctx[3]);
			attr(span, "class", "imageLabel svelte-1g2ovuy");
			set_style(span, "left", `0`);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*caption1*/ 8) set_data(t, /*caption1*/ ctx[3]);
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (80:4) {#if caption2}
function create_if_block_3(ctx) {
	let span;
	let t;

	return {
		c() {
			span = element("span");
			t = text(/*caption2*/ ctx[4]);
			attr(span, "class", "imageLabel svelte-1g2ovuy");
			set_style(span, "right", `0`);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*caption2*/ 16) set_data(t, /*caption2*/ ctx[4]);
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (97:42) 
function create_if_block_2(ctx) {
	let svg;
	let line0;
	let line1;
	let circle0;
	let line2;
	let line3;
	let circle1;

	return {
		c() {
			svg = svg_element("svg");
			line0 = svg_element("line");
			line1 = svg_element("line");
			circle0 = svg_element("circle");
			line2 = svg_element("line");
			line3 = svg_element("line");
			circle1 = svg_element("circle");
			attr(line0, "x1", "10");
			attr(line0, "y1", "50");
			attr(line0, "x2", "30");
			attr(line0, "y2", "30");
			set_style(line0, "stroke", /*separatorColor*/ ctx[6]);
			set_style(line0, "stroke-width", `7`);
			attr(line1, "x1", "10");
			attr(line1, "y1", "50");
			attr(line1, "x2", "30");
			attr(line1, "y2", "70");
			set_style(line1, "stroke", /*separatorColor*/ ctx[6]);
			set_style(line1, "stroke-width", `7`);
			attr(circle0, "cx", "10");
			attr(circle0, "cy", "50");
			attr(circle0, "r", "3.5");
			set_style(circle0, "fill", /*separatorColor*/ ctx[6]);
			attr(line2, "x1", "90");
			attr(line2, "y1", "50");
			attr(line2, "x2", "70");
			attr(line2, "y2", "30");
			set_style(line2, "stroke", /*separatorColor*/ ctx[6]);
			set_style(line2, "stroke-width", `7`);
			attr(line3, "x1", "90");
			attr(line3, "y1", "50");
			attr(line3, "x2", "70");
			attr(line3, "y2", "70");
			set_style(line3, "stroke", /*separatorColor*/ ctx[6]);
			set_style(line3, "stroke-width", `7`);
			attr(circle1, "cx", "90");
			attr(circle1, "cy", "50");
			attr(circle1, "r", "3.5");
			set_style(circle1, "fill", /*separatorColor*/ ctx[6]);
			attr(svg, "viewBox", "0 0 100 100");
			set_style(svg, "width", `100%`);
			set_style(svg, "height", `100%`);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, line0);
			append(svg, line1);
			append(svg, circle0);
			append(svg, line2);
			append(svg, line3);
			append(svg, circle1);
		},
		p(ctx, dirty) {
			if (dirty & /*separatorColor*/ 64) {
				set_style(line0, "stroke", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(line1, "stroke", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(circle0, "fill", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(line2, "stroke", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(line3, "stroke", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(circle1, "fill", /*separatorColor*/ ctx[6]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(svg);
			}
		}
	};
}

// (91:42) 
function create_if_block_1(ctx) {
	let svg;
	let circle;
	let polygon0;
	let polygon1;

	return {
		c() {
			svg = svg_element("svg");
			circle = svg_element("circle");
			polygon0 = svg_element("polygon");
			polygon1 = svg_element("polygon");
			attr(circle, "cx", "50");
			attr(circle, "cy", "50");
			attr(circle, "r", "45");
			set_style(circle, "fill", `transparent`);
			set_style(circle, "stroke", /*separatorColor*/ ctx[6]);
			set_style(circle, "stroke-width", `7`);
			attr(polygon0, "points", "30,40 20,50 30,60");
			set_style(polygon0, "fill", /*separatorColor*/ ctx[6]);
			attr(polygon1, "points", "70,40 80,50 70,60");
			set_style(polygon1, "fill", /*separatorColor*/ ctx[6]);
			attr(svg, "viewBox", "0 0 100 100");
			set_style(svg, "width", `100%`);
			set_style(svg, "height", `100%`);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, circle);
			append(svg, polygon0);
			append(svg, polygon1);
		},
		p(ctx, dirty) {
			if (dirty & /*separatorColor*/ 64) {
				set_style(circle, "stroke", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(polygon0, "fill", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(polygon1, "fill", /*separatorColor*/ ctx[6]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(svg);
			}
		}
	};
}

// (86:8) {#if handleType === "triangles"}
function create_if_block(ctx) {
	let svg;
	let polygon0;
	let polygon1;

	return {
		c() {
			svg = svg_element("svg");
			polygon0 = svg_element("polygon");
			polygon1 = svg_element("polygon");
			attr(polygon0, "points", "30,20 0,50 30,80");
			set_style(polygon0, "fill", /*separatorColor*/ ctx[6]);
			attr(polygon1, "points", "70,20 100,50 70,80");
			set_style(polygon1, "fill", /*separatorColor*/ ctx[6]);
			attr(svg, "viewBox", "0 0 100 100");
			set_style(svg, "width", `100%`);
			set_style(svg, "height", `100%`);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, polygon0);
			append(svg, polygon1);
		},
		p(ctx, dirty) {
			if (dirty & /*separatorColor*/ 64) {
				set_style(polygon0, "fill", /*separatorColor*/ ctx[6]);
			}

			if (dirty & /*separatorColor*/ 64) {
				set_style(polygon1, "fill", /*separatorColor*/ ctx[6]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(svg);
			}
		}
	};
}

function create_fragment(ctx) {
	let div4;
	let div0;
	let img0;
	let img0_src_value;
	let t0;
	let div1;
	let img1;
	let img1_src_value;
	let style_width = `calc(${100 - /*sliderPercent*/ ctx[0]}% - ${/*separatorWidth*/ ctx[5] / 2}px)`;
	let style_border_left = `${/*separatorWidth*/ ctx[5]}px solid ${/*separatorColor*/ ctx[6]}`;
	let style_max_width = `calc(100% - ${/*separatorWidth*/ ctx[5]}px)`;
	let t1;
	let t2;
	let t3;
	let div2;
	let style_left = `${/*sliderPercent*/ ctx[0]}%`;
	let style_width_1 = `${/*handleSize*/ ctx[8]}px`;
	let style_height = `${/*handleSize*/ ctx[8]}px`;
	let t4;
	let div3;
	let mounted;
	let dispose;
	let if_block0 = /*caption1*/ ctx[3] && create_if_block_4(ctx);
	let if_block1 = /*caption2*/ ctx[4] && create_if_block_3(ctx);

	function select_block_type(ctx, dirty) {
		if (/*handleType*/ ctx[7] === "triangles") return create_if_block;
		if (/*handleType*/ ctx[7] === "circle") return create_if_block_1;
		if (/*handleType*/ ctx[7] === "arrows") return create_if_block_2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block2 = current_block_type && current_block_type(ctx);

	return {
		c() {
			div4 = element("div");
			div0 = element("div");
			img0 = element("img");
			t0 = space();
			div1 = element("div");
			img1 = element("img");
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			t3 = space();
			div2 = element("div");
			if (if_block2) if_block2.c();
			t4 = space();
			div3 = element("div");
			div3.innerHTML = ``;
			if (!src_url_equal(img0.src, img0_src_value = /*src1*/ ctx[1])) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "before");
			attr(img0, "draggable", false);
			attr(img0, "class", "svelte-1g2ovuy");
			set_style(img0, "width", `100%`);
			if (!src_url_equal(img1.src, img1_src_value = /*src2*/ ctx[2])) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "after");
			attr(img1, "draggable", false);
			attr(img1, "class", "svelte-1g2ovuy");
			set_style(img1, "height", `100%`);
			set_style(img1, "float", `right`);
			set_style(div1, "position", `absolute`);
			set_style(div1, "top", `0`);
			set_style(div1, "right", `0`);
			set_style(div1, "height", `100%`);
			set_style(div1, "overflow-x", `hidden`);
			set_style(div1, "width", style_width);
			set_style(div1, "border-left", style_border_left);
			set_style(div1, "transition", `width 0.1s`);
			set_style(div1, "max-width", style_max_width);
			set_style(div1, "min-width", `0`);
			set_style(div2, "position", `absolute`);
			set_style(div2, "top", `50%`);
			set_style(div2, "left", style_left);
			set_style(div2, "width", style_width_1);
			set_style(div2, "height", style_height);
			set_style(div2, "transform", `translate(-50%, -50%)`);
			set_style(div2, "transition", `left 0.1s`);
			attr(div3, "class", "invisibleCover svelte-1g2ovuy");
			set_style(div3, "cursor", /*dragging*/ ctx[10] ? "ew-resize" : "pointer");
			attr(div4, "class", "imageSlider svelte-1g2ovuy");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);
			append(div0, img0);
			append(div4, t0);
			append(div4, div1);
			append(div1, img1);
			append(div4, t1);
			if (if_block0) if_block0.m(div4, null);
			append(div4, t2);
			if (if_block1) if_block1.m(div4, null);
			append(div4, t3);
			append(div4, div2);
			if (if_block2) if_block2.m(div2, null);
			append(div4, t4);
			append(div4, div3);
			/*div3_binding*/ ctx[18](div3);

			if (!mounted) {
				dispose = [
					listen(window, "mousemove", /*mousemove_handler*/ ctx[14]),
					listen(window, "mouseup", /*mouseup_handler*/ ctx[15]),
					listen(window, "touchmove", /*touchmove_handler*/ ctx[16]),
					listen(window, "touchend", /*touchend_handler*/ ctx[17]),
					listen(div3, "mousedown", /*mousedown_handler*/ ctx[19]),
					listen(div3, "touchstart", /*touchstart_handler*/ ctx[20])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*src1*/ 2 && !src_url_equal(img0.src, img0_src_value = /*src1*/ ctx[1])) {
				attr(img0, "src", img0_src_value);
			}

			if (dirty & /*src2*/ 4 && !src_url_equal(img1.src, img1_src_value = /*src2*/ ctx[2])) {
				attr(img1, "src", img1_src_value);
			}

			if (dirty & /*sliderPercent, separatorWidth*/ 33 && style_width !== (style_width = `calc(${100 - /*sliderPercent*/ ctx[0]}% - ${/*separatorWidth*/ ctx[5] / 2}px)`)) {
				set_style(div1, "width", style_width);
			}

			if (dirty & /*separatorWidth, separatorColor*/ 96 && style_border_left !== (style_border_left = `${/*separatorWidth*/ ctx[5]}px solid ${/*separatorColor*/ ctx[6]}`)) {
				set_style(div1, "border-left", style_border_left);
			}

			if (dirty & /*separatorWidth*/ 32 && style_max_width !== (style_max_width = `calc(100% - ${/*separatorWidth*/ ctx[5]}px)`)) {
				set_style(div1, "max-width", style_max_width);
			}

			if (/*caption1*/ ctx[3]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_4(ctx);
					if_block0.c();
					if_block0.m(div4, t2);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*caption2*/ ctx[4]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_3(ctx);
					if_block1.c();
					if_block1.m(div4, t3);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block2) {
				if_block2.p(ctx, dirty);
			} else {
				if (if_block2) if_block2.d(1);
				if_block2 = current_block_type && current_block_type(ctx);

				if (if_block2) {
					if_block2.c();
					if_block2.m(div2, null);
				}
			}

			if (dirty & /*sliderPercent*/ 1 && style_left !== (style_left = `${/*sliderPercent*/ ctx[0]}%`)) {
				set_style(div2, "left", style_left);
			}

			if (dirty & /*handleSize*/ 256 && style_width_1 !== (style_width_1 = `${/*handleSize*/ ctx[8]}px`)) {
				set_style(div2, "width", style_width_1);
			}

			if (dirty & /*handleSize*/ 256 && style_height !== (style_height = `${/*handleSize*/ ctx[8]}px`)) {
				set_style(div2, "height", style_height);
			}

			if (dirty & /*dragging*/ 1024) {
				set_style(div3, "cursor", /*dragging*/ ctx[10] ? "ew-resize" : "pointer");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(div4);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();

			if (if_block2) {
				if_block2.d();
			}

			/*div3_binding*/ ctx[18](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { sliderPercent = 50 } = $$props;
	let { src1 } = $$props;
	let { src2 } = $$props;
	let { caption1 = "" } = $$props;
	let { caption2 = "" } = $$props;
	let { separatorWidth = 4 } = $$props;
	let { separatorColor = "white" } = $$props;
	let { handleType = "none" } = $$props;
	let { handleSize = 42 } = $$props;

	/** @type {HTMLDivElement} */
	let invisibleCover;

	/** Whether the user is currently dragging the slider. Used for svelte:document event listeners. */
	let dragging = false;

	/**
 * Calculate slider percent based on mouse position.
 * @param {MouseEvent} e
 */
	function handleDrag(e) {
		$$invalidate(0, sliderPercent = (e.clientX - invisibleCover.getBoundingClientRect().x) / invisibleCover.getBoundingClientRect().width * 100);
		$$invalidate(0, sliderPercent = Math.min(Math.max(sliderPercent, 0), 100));
	}

	/** Index of the correct touch event */
	let touchIndex = 0;

	/**
 * Calculate slider percent based on touch position.
 * @param {TouchEvent} e
 */
	function handleMobileDrag(e) {
		$$invalidate(0, sliderPercent = (e.touches[touchIndex].clientX - invisibleCover.getBoundingClientRect().x) / invisibleCover.getBoundingClientRect().width * 100);
		$$invalidate(0, sliderPercent = Math.min(Math.max(sliderPercent, 0), 100));
	}

	const mousemove_handler = e => {
		if (dragging) handleDrag(e);
	};

	const mouseup_handler = () => {
		$$invalidate(10, dragging = false);
	};

	const touchmove_handler = e => {
		if (dragging) handleMobileDrag(e);
	};

	const touchend_handler = () => {
		$$invalidate(10, dragging = false);
	};

	function div3_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			invisibleCover = $$value;
			$$invalidate(9, invisibleCover);
		});
	}

	const mousedown_handler = e => {
		e.preventDefault();
		$$invalidate(10, dragging = true);
		handleDrag(e);
	};

	const touchstart_handler = e => {
		e.preventDefault();
		$$invalidate(10, dragging = true);
		$$invalidate(11, touchIndex = e.touches.length - 1);
		handleMobileDrag(e);
	};

	$$self.$$set = $$props => {
		if ('sliderPercent' in $$props) $$invalidate(0, sliderPercent = $$props.sliderPercent);
		if ('src1' in $$props) $$invalidate(1, src1 = $$props.src1);
		if ('src2' in $$props) $$invalidate(2, src2 = $$props.src2);
		if ('caption1' in $$props) $$invalidate(3, caption1 = $$props.caption1);
		if ('caption2' in $$props) $$invalidate(4, caption2 = $$props.caption2);
		if ('separatorWidth' in $$props) $$invalidate(5, separatorWidth = $$props.separatorWidth);
		if ('separatorColor' in $$props) $$invalidate(6, separatorColor = $$props.separatorColor);
		if ('handleType' in $$props) $$invalidate(7, handleType = $$props.handleType);
		if ('handleSize' in $$props) $$invalidate(8, handleSize = $$props.handleSize);
	};

	return [
		sliderPercent,
		src1,
		src2,
		caption1,
		caption2,
		separatorWidth,
		separatorColor,
		handleType,
		handleSize,
		invisibleCover,
		dragging,
		touchIndex,
		handleDrag,
		handleMobileDrag,
		mousemove_handler,
		mouseup_handler,
		touchmove_handler,
		touchend_handler,
		div3_binding,
		mousedown_handler,
		touchstart_handler
	];
}

class ImageSlider extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				sliderPercent: 0,
				src1: 1,
				src2: 2,
				caption1: 3,
				caption2: 4,
				separatorWidth: 5,
				separatorColor: 6,
				handleType: 7,
				handleSize: 8
			},
			add_css
		);
	}
}

export { ImageSlider as default };

local wezterm = require("wezterm")

local opts = {
	font = wezterm.font_with_fallback({
		"JetBrainsMono NF",
		"Fira Code",
		"monospace",
	}),

	-- Set the font size
	font_size = 12,

	initial_rows = 40,
	initial_cols = 160,

	cursor_blink_ease_in = "Linear",
	cursor_blink_ease_out = "EaseIn",
	cursor_blink_rate = 400,

	use_fancy_tab_bar = false,

	-- Set the window padding
	window_padding = {
		left = "0%",
		right = "0%",
		top = "0%",
		bottom = "0%",
	},

	-- Set the animation framerate
	animation_fps = 60, -- default: 60

	-- Wayland
	--enable_wayland = false,

	-- Window Decorations
	window_decorations = "TITLE | RESIZE",
	-- window_decorations = "NONE",
	-- window_decorations = "TITLE | RESIZE | INTEGRATED_BUTTONS",
	--window_decorations = "RESIZE | INTEGRATED_BUTTONS",
	integrated_title_buttons = { "Hide", "Maximize", "Close" },
	window_frame = {
		inactive_titlebar_bg = "#353535",
		active_titlebar_bg = "#2b2042",
		inactive_titlebar_fg = "#cccccc",
		active_titlebar_fg = "#ffffff",
		inactive_titlebar_border_bottom = "#2b2042",
		active_titlebar_border_bottom = "#2b2042",
		button_fg = "#cccccc",
		button_bg = "#2b2042",
		button_hover_fg = "#ffffff",
		button_hover_bg = "#3b3052",
	},

	-- Visual Bell
	visual_bell = {
		fade_in_function = "EaseIn",
		fade_in_duration_ms = 150,
		fade_out_function = "EaseOut",
		fade_out_duration_ms = 150,
	},
	--{
	--  fade_in_duration_ms = 75,
	--  fade_out_duration_ms = 75,
	--  target = "CursorColor",
	--},

	-- Audible Bell
	audible_bell = "Disabled",

	-- Terminal Variable
	-- term = "wezterm",

	--Honor kitty protocol inputs
	enable_kitty_keyboard = true,

	-- Rendering
	front_end = "WebGpu",
	-- webgpu_power_preference = "HighPerformance",
	-- webgpu_power_preference = "LowPower",
	-- webgpu_preferred_adapter = gpus[1],
	-- front_end = "OpenGL",

	-- Scrollback Lines
	scrollback_lines = 20000,

	-- Exit Behavior
	exit_behavior_messaging = "Brief",
	exit_behavior = "CloseOnCleanExit",
}

return opts

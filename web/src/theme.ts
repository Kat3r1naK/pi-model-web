/**
 * antd 主题配置：对齐 ardot 设计稿「pi Model Web — 苹果风格重设计」。
 * 色值来源：设计稿节点取色（#007AFF 主色、#F5F5F7 页面底色、#1D1D1F 标题、#6E6E73 次级文字、#E5E5EB 边框）。
 */
import type { ThemeConfig } from "antd";

export const appleTheme: ThemeConfig = {
	token: {
		colorPrimary: "#007AFF",
		colorInfo: "#007AFF",
		colorSuccess: "#34C759",
		colorWarning: "#FF9500",
		colorError: "#FF3B30",
		colorBgLayout: "#F5F5F7",
		colorText: "#1D1D1F",
		colorTextSecondary: "#6E6E73",
		colorTextTertiary: "#86868B",
		colorBorder: "#E5E5EB",
		colorBorderSecondary: "#E6E6EB",
		borderRadius: 10,
		borderRadiusLG: 14,
		fontFamily:
			'Inter, "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
		boxShadowTertiary: "0 2px 8px rgba(0, 0, 0, 0.04)",
	},
	components: {
		Button: {
			primaryShadow: "0 2px 6px rgba(0, 122, 255, 0.28)",
			controlHeight: 36,
			borderRadius: 10,
		},
		Input: {
			controlHeight: 36,
		},
		Select: {
			controlHeight: 38,
		},
		Drawer: {
			borderRadiusLG: 0,
		},
	},
};

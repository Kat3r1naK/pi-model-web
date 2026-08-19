import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 扩展服务已支持托管 /assets/* 静态资源（见 extension/routes/assets.ts），
// 因此可以正常代码分割 + React.lazy 按需加载，不再需要 singlefile 内联。
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "dist",
		target: "es2020",
		rollupOptions: {
			output: {
				manualChunks: {
					// react 首屏必需，单独成块便于浏览器缓存；
					// antd 不强制打包：由 rollup 按引用图自然分割，
					// 配合 React.lazy 把抽屉专用组件（Form/Drawer/InputNumber 等）拆进懒加载 chunk
					vendor: ["react", "react-dom"],
				},
			},
		},
	},
});

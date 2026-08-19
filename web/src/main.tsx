import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import { appleTheme } from "./theme";
import "./styles.css";

// 首次访问已用 URL token 换取会话 Cookie，把地址栏里的 token 参数抹掉
const currentUrl = new URL(window.location.href);
if (currentUrl.searchParams.has("token")) {
	currentUrl.searchParams.delete("token");
	window.history.replaceState(null, "", currentUrl);
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ConfigProvider theme={appleTheme} locale={zhCN}>
			<AntdApp>
				<App />
			</AntdApp>
		</ConfigProvider>
	</StrictMode>,
);

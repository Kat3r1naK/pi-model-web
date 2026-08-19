/**
 * 页面组装：毛玻璃 Header + 统计概览 + 两栏列表 + 双抽屉表单。
 * 布局与视觉对齐 ardot 设计稿「pi Model Web — 苹果风格重设计」。
 */
import { App as AntdApp } from "antd";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { deleteModel } from "./api/model/delete";
import { deleteProvider } from "./api/provider/delete";
import { getConfig } from "./api/config";
import type { ConfigResponse, ModelInfo, ProviderInfo } from "./api/config/types";
import HeaderBar from "./components/HeaderBar";
import ModelColumn from "./components/ModelColumn";
import ProviderColumn from "./components/ProviderColumn";
import StatsCards from "./components/StatsCards";

// 两个抽屉表单是最重的组件（Form/Drawer/Select/InputNumber 等），
// 首屏用不到，懒加载拆到独立 chunk，打开时才下载。
const ProviderDrawer = lazy(() => import("./components/ProviderDrawer"));
const ModelDrawer = lazy(() => import("./components/ModelDrawer"));
const ImportCcSwitchModal = lazy(() => import("./components/ImportCcSwitchModal"));

interface DrawerState<T> {
	open: boolean;
	target: T | null;
}

export default function App() {
	const { message } = AntdApp.useApp();
	const [config, setConfig] = useState<ConfigResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [providerId, setProviderId] = useState<string | null>(null);
	const [providerDrawer, setProviderDrawer] = useState<DrawerState<ProviderInfo>>({ open: false, target: null });
	const [modelDrawer, setModelDrawer] = useState<DrawerState<ModelInfo>>({ open: false, target: null });
	const [importOpen, setImportOpen] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await getConfig();
			setConfig(data);
			setProviderId((current) =>
				current && data.providers.some((p) => p.id === current)
					? current
					: (data.providers[0]?.id ?? null),
			);
		} catch (error) {
			message.error(`读取配置失败：${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setLoading(false);
		}
	}, [message]);

	useEffect(() => {
		void load();
	}, [load]);

	const provider = useMemo(
		() => config?.providers.find((p) => p.id === providerId),
		[config, providerId],
	);

	const notifyResult = (successText: string, refreshError?: string) => {
		if (refreshError) message.warning(`${successText}，但 pi 刷新模型失败：${refreshError}`);
		else message.success(successText);
	};

	const handleDeleteProvider = async (target: ProviderInfo) => {
		try {
			const result = await deleteProvider(target.id);
			notifyResult("Provider 已删除", result.refreshError);
			await load();
		} catch (error) {
			message.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleDeleteModel = async (target: ModelInfo) => {
		if (!providerId) return;
		try {
			const result = await deleteModel(providerId, target.id);
			notifyResult("Model 已删除", result.refreshError);
			await load();
		} catch (error) {
			message.error(error instanceof Error ? error.message : String(error));
		}
	};

	return (
		<div className="page">
			<HeaderBar
				configFile={config?.file}
				loading={loading}
				onRefresh={() => void load()}
				onInfo={(text) => message.info(text)}
				onImport={() => setImportOpen(true)}
			/>
			<StatsCards config={config} />
			<main className="main-columns">
				<ProviderColumn
					providers={config?.providers ?? []}
					selectedId={providerId}
					onSelect={(id) => setProviderId(id)}
					onCreate={() => setProviderDrawer({ open: true, target: null })}
					onEdit={(p) => setProviderDrawer({ open: true, target: p })}
					onDelete={(p) => void handleDeleteProvider(p)}
				/>
				<ModelColumn
					providers={config?.providers ?? []}
					provider={provider}
					onSelectProvider={setProviderId}
					onCreate={() => setModelDrawer({ open: true, target: null })}
					onEdit={(m) => setModelDrawer({ open: true, target: m })}
					onDelete={(m) => void handleDeleteModel(m)}
				/>
			</main>

			<Suspense fallback={null}>
				{providerDrawer.open && (
					<ProviderDrawer
						open={providerDrawer.open}
						provider={providerDrawer.target}
						onClose={() => setProviderDrawer({ open: false, target: null })}
						onSaved={(id, refreshError) => {
							notifyResult("Provider 已保存", refreshError);
							setProviderDrawer({ open: false, target: null });
							setProviderId(id);
							void load();
						}}
						onError={(text) => message.error(text)}
					/>
				)}
				{modelDrawer.open && (
					<ModelDrawer
						open={modelDrawer.open}
						providerId={providerId}
						model={modelDrawer.target}
						onClose={() => setModelDrawer({ open: false, target: null })}
						onSaved={(refreshError) => {
							notifyResult("Model 已保存", refreshError);
							setModelDrawer({ open: false, target: null });
							void load();
						}}
						onError={(text) => message.error(text)}
					/>
				)}
				{importOpen && (
					<ImportCcSwitchModal
						open={importOpen}
						onClose={() => setImportOpen(false)}
						onImported={(count, refreshError) => {
							notifyResult(`已导入 ${count} 个 provider`, refreshError);
							setImportOpen(false);
							void load();
						}}
						onError={(text) => message.error(text)}
					/>
				)}
			</Suspense>
		</div>
	);
}

/** 导入 cc-Switch 配置弹窗：codex / claude 切换 + 手动勾选要导入的配置 */
import { Alert, Button, Checkbox, Empty, Modal, Segmented, Spin, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { importCcSwitch, scanCcSwitch } from "../api/import/cc-switch";
import type { ImportAppType, ImportCandidate } from "../api/import/cc-switch/types";

interface ImportCcSwitchModalProps {
	open: boolean;
	onClose: () => void;
	onImported: (count: number, modelCount: number, refreshError?: string) => void;
	onError: (message: string) => void;
}

const APP_TYPE_LABELS: Record<ImportAppType, string> = {
	codex: "Codex",
	claude: "Claude",
};

export default function ImportCcSwitchModal({ open, onClose, onImported, onError }: ImportCcSwitchModalProps) {
	const [appType, setAppType] = useState<ImportAppType>("codex");
	const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
	const [scanning, setScanning] = useState(false);
	const [selected, setSelected] = useState<string[]>([]);
	const [importing, setImporting] = useState(false);

	const scan = useCallback(
		async (type: ImportAppType) => {
			setScanning(true);
			setSelected([]);
			try {
				const result = await scanCcSwitch(type);
				setCandidates(result.candidates);
			} catch (error) {
				setCandidates([]);
				onError(error instanceof Error ? error.message : String(error));
			} finally {
				setScanning(false);
			}
		},
		[onError],
	);

	useEffect(() => {
		if (open) void scan(appType);
	}, [open, appType, scan]);

	const switchType = (value: ImportAppType) => {
		setAppType(value);
	};

	const toggle = (id: string, checked: boolean) => {
		setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
	};

	const importableCount = candidates.filter((c) => c.hasApiKey).length;
	const allImportableSelected = importableCount > 0 && selected.length === importableCount;

	const toggleAll = (checked: boolean) => {
		setSelected(checked ? candidates.filter((c) => c.hasApiKey).map((c) => c.id) : []);
	};

	const handleImport = async () => {
		setImporting(true);
		try {
			const result = await importCcSwitch({ appType, ids: selected });
			onImported(result.imported.length, result.modelCount, result.refreshError);
		} catch (error) {
			onError(error instanceof Error ? error.message : String(error));
		} finally {
			setImporting(false);
		}
	};

	return (
		<Modal
			title="导入 cc-Switch 配置"
			open={open}
			onCancel={onClose}
			width={560}
			destroyOnHidden
			footer={
				<div className="import-footer">
					<span className="import-footer-hint">
						已选 {selected.length} 项 · API Key 由服务端直接写入，不经过浏览器
					</span>
					<div>
						<Button onClick={onClose} style={{ marginRight: 8 }}>
							取消
						</Button>
						<Button type="primary" loading={importing} disabled={selected.length === 0} onClick={handleImport}>
							导入所选
						</Button>
					</div>
				</div>
			}
		>
			<div className="import-toolbar">
				<Segmented
					value={appType}
					options={[
						{ value: "codex", label: "Codex" },
						{ value: "claude", label: "Claude" },
					]}
					onChange={(value) => switchType(value as ImportAppType)}
				/>
				<Checkbox checked={allImportableSelected} onChange={(event) => toggleAll(event.target.checked)}>
					全选可导入项
				</Checkbox>
			</div>

			<Spin spinning={scanning}>
				<div className="import-list">
					{candidates.length === 0 && !scanning ? (
						<Empty description={`cc-Switch 中没有 ${APP_TYPE_LABELS[appType]} 配置`} />
					) : (
						candidates.map((candidate) => (
							<label
								key={candidate.id}
								className={`import-item${candidate.hasApiKey ? "" : " import-item-disabled"}`}
							>
								<Checkbox
									disabled={!candidate.hasApiKey}
									checked={selected.includes(candidate.id)}
									onChange={(event) => toggle(candidate.id, event.target.checked)}
								/>
								<div className="import-item-body">
									<div className="import-item-title">
										{candidate.name || candidate.id}
										<Tag color={appType === "claude" ? "orange" : "green"} style={{ marginLeft: 8 }}>
											{APP_TYPE_LABELS[appType]}
										</Tag>
										{!candidate.hasApiKey && (
											<Tag color="default">
												{candidate.authMode === "chatgpt" ? "ChatGPT 登录态，无法导入" : "无 API Key"}
											</Tag>
										)}
									</div>
									<div className="import-item-meta">
										{candidate.baseUrl ?? "使用默认地址"} · 附带 {candidate.modelCount} 个模型
									</div>
								</div>
							</label>
						))
					)}
				</div>
			</Spin>

			<Alert
				type="info"
				showIcon
				message="导入内容：连接信息 + API Key + 模型列表（取自各配置自带的模型设置，价格按定价表补充）；provider id 同名自动加数字后缀"
				style={{ marginTop: 12 }}
			/>
		</Modal>
	);
}

/** 顶部毛玻璃导航 + 配置文件信息条（对齐设计稿「Header 毛玻璃导航」「配置文件信息条」） */
import { QuestionCircleOutlined, ReloadOutlined, SwapOutlined, ImportOutlined } from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";

interface HeaderBarProps {
	configFile?: string;
	loading: boolean;
	onRefresh: () => void;
	onInfo: (message: string) => void;
	onImport: () => void;
}

export default function HeaderBar({ configFile, loading, onRefresh, onInfo, onImport }: HeaderBarProps) {
	return (
		<>
			<header className="glass-header">
				<div className="header-title-group">
					<div className="header-title-row">
						<h1 className="page-title">pi Model</h1>
						<span className="version-badge">Web UI</span>
					</div>
					<p className="page-subtitle">可视化管理 Provider 与 Model，保存后自动刷新 pi 模型目录</p>
				</div>
				<Space size={10}>
					<span className="listen-pill">仅监听 127.0.0.1</span>
					<Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
						刷新配置
					</Button>
					<Button icon={<SwapOutlined />} onClick={() => onInfo("测试连接功能待后端支持")}>
						测试连接
					</Button>
					<Button icon={<ImportOutlined />} onClick={onImport}>
						导入 cc-Switch
					</Button>
					<Tooltip title="保存后会自动刷新 pi 模型目录；编辑时留空字段 = 保留原值">
						<Button shape="circle" icon={<QuestionCircleOutlined />} aria-label="帮助" />
					</Tooltip>
				</Space>
			</header>
			<div className="config-info-bar">
				<span className="config-path">配置文件：{configFile ?? (loading ? "正在读取…" : "读取失败")}</span>
				{configFile && <span className="sync-badge">模型目录已同步</span>}
			</div>
		</>
	);
}

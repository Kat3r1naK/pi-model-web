/** 统计概览区：4 张统计卡（Providers / Models / API Key / 本地监听） */
import { AppstoreOutlined, KeyOutlined, RobotOutlined, SafetyOutlined } from "@ant-design/icons";
import type { ConfigResponse } from "../api/config/types";

interface StatsCardsProps {
	config: ConfigResponse | null;
}

export default function StatsCards({ config }: StatsCardsProps) {
	const providerCount = config?.providers.length ?? 0;
	const modelCount = config?.providers.reduce((sum, p) => sum + p.models.length, 0) ?? 0;
	const keySetCount = config?.providers.filter((p) => p.apiKeySet).length ?? 0;

	const cards = [
		{
			value: String(providerCount),
			label: "Providers",
			sub: "服务商",
			icon: <AppstoreOutlined />,
			tone: "blue",
		},
		{
			value: String(modelCount),
			label: "Models",
			sub: "模型总数",
			icon: <RobotOutlined />,
			tone: "orange",
		},
		{
			value: `${keySetCount}/${providerCount}`,
			label: "API Key",
			sub: "已配置",
			icon: <KeyOutlined />,
			tone: "green",
		},
		{
			value: "127.0.0.1",
			label: "仅本地监听",
			sub: "安全",
			icon: <SafetyOutlined />,
			tone: "purple",
		},
	];

	return (
		<div className="stats-row">
			{cards.map((card) => (
				<div key={card.label} className="stat-card">
					<span className={`stat-icon tone-${card.tone}`}>{card.icon}</span>
					<div className="stat-text">
						<span className="stat-value">{card.value}</span>
						<span className="stat-label">
							{card.label} · {card.sub}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

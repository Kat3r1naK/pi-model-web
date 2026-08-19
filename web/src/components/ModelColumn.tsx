/** 右栏 Model：Section 头（Provider 切换 + 新建）+ 搜索工具栏 + 双列卡片网格 */
import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Empty, Input, Popconfirm, Select, Tag } from "antd";
import { useMemo, useState } from "react";
import type { ModelInfo, ProviderInfo } from "../api/config/types";

interface ModelColumnProps {
	providers: ProviderInfo[];
	provider: ProviderInfo | undefined;
	onSelectProvider: (id: string) => void;
	onCreate: () => void;
	onEdit: (model: ModelInfo) => void;
	onDelete: (model: ModelInfo) => void;
}

/** 128000 → 128K，16384 → 16K，1000000 → 1M */
export function formatTokens(value: number): string {
	if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`.replace(".0M", "M");
	if (value >= 1000) return `${Math.round(value / 1000)}K`;
	return String(value);
}

export default function ModelColumn({
	providers,
	provider,
	onSelectProvider,
	onCreate,
	onEdit,
	onDelete,
}: ModelColumnProps) {
	const [keyword, setKeyword] = useState("");

	const models = useMemo(() => {
		const list = provider?.models ?? [];
		const query = keyword.trim().toLowerCase();
		if (!query) return list;
		return list.filter(
			(m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query),
		);
	}, [provider, keyword]);

	return (
		<section className="column">
			<div className="section-head">
				<div className="section-title-group">
					<h2 className="section-title">Model</h2>
					<span className="count-badge">{provider?.models.length ?? 0}</span>
				</div>
				<div className="section-actions">
					<Select
						className="provider-switch"
						value={provider?.id}
						placeholder="选择 Provider"
						options={providers.map((p) => ({
							value: p.id,
							label: p.name && p.name !== p.id ? `${p.id} — ${p.name}` : p.id,
						}))}
						onChange={onSelectProvider}
					/>
					<Button type="primary" icon={<PlusOutlined />} onClick={onCreate} disabled={!provider}>
						新建 Model
					</Button>
				</div>
			</div>

			<div className="model-toolbar">
				<Input
					className="model-search"
					prefix={<SearchOutlined style={{ color: "#AEAEB2" }} />}
					placeholder="搜索 Model ID 或名称…"
					allowClear
					value={keyword}
					onChange={(event) => setKeyword(event.target.value)}
				/>
				<Button icon={<FilterOutlined />}>筛选</Button>
			</div>

			{!provider ? (
				<Empty description="请先添加并选择 provider" />
			) : models.length === 0 ? (
				<Empty description={keyword ? "没有匹配的 model" : "这个 provider 还没有 model"} />
			) : (
				<div className="model-grid">
					{models.map((m) => (
						<div key={m.id} className="model-card">
							<div className="model-card-head">
								<span className="model-id">{m.name && m.name !== m.id ? `${m.id} — ${m.name}` : m.id}</span>
								<div className="row-actions">
									<Button size="small" type="link" onClick={() => onEdit(m)}>
										编辑
									</Button>
									<Popconfirm
										title={`删除 model ${m.id}？`}
										description="删除后立即刷新 pi 模型目录，不可撤销"
										okText="删除"
										okButtonProps={{ danger: true }}
										cancelText="取消"
										onConfirm={() => onDelete(m)}
									>
										<Button size="small" type="link" danger>
											删除
										</Button>
									</Popconfirm>
								</div>
							</div>
							<div className="model-tags">
								{m.reasoning && <Tag color="blue">thinking</Tag>}
								<Tag>{m.input.join("+")}</Tag>
							</div>
							<div className="model-spec">
								Context {formatTokens(m.contextWindow)} · Max {formatTokens(m.maxTokens)} · $
								{m.cost.input} / ${m.cost.output} 每 1M tokens
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

/** 左栏 Provider：Section 头 + 紧凑列表（选中态浅蓝描边）+ 配置提示卡 */
import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Popconfirm } from "antd";
import type { ProviderInfo } from "../api/config/types";

interface ProviderColumnProps {
	providers: ProviderInfo[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onEdit: (provider: ProviderInfo) => void;
	onDelete: (provider: ProviderInfo) => void;
}

const TIPS = [
	"API Key 支持环境变量引用，如 $OPENAI_KEY",
	"编辑时留空字段 = 保留原值，清除需勾选对应开关",
	"保存后自动刷新 pi 模型目录，无需重启",
];

export default function ProviderColumn({
	providers,
	selectedId,
	onSelect,
	onCreate,
	onEdit,
	onDelete,
}: ProviderColumnProps) {
	return (
		<section className="column">
			<div className="section-head">
				<div className="section-title-group">
					<h2 className="section-title">Provider</h2>
					<span className="count-badge">{providers.length}</span>
				</div>
				<Button type="primary" shape="round" icon={<PlusOutlined />} onClick={onCreate}>
					新建
				</Button>
			</div>

			<div className="provider-list">
				{providers.length === 0 ? (
					<Empty description="还没有 provider，请先添加一个" />
				) : (
					providers.map((p) => (
						<div
							key={p.id}
							className={`provider-row${p.id === selectedId ? " provider-row-selected" : ""}`}
							onClick={() => onSelect(p.id)}
						>
							<div className="provider-info">
								<div className="provider-title">
									<span className={`status-dot${p.apiKeySet ? " status-dot-on" : ""}`} />
									<span className="provider-name">{p.name && p.name !== p.id ? `${p.id} — ${p.name}` : p.id}</span>
								</div>
								<div className="provider-meta">
									{p.models.length} models · {p.apiKeySet ? `key 已设置（${p.apiKeyMasked}）` : "key 未设置"} · {p.api || "未知 API"}
								</div>
							</div>
							<div className="row-actions" onClick={(event) => event.stopPropagation()}>
								<Button size="small" type="link" onClick={() => onEdit(p)}>
									编辑
								</Button>
								<Popconfirm
									title={`删除 provider ${p.id}？`}
									description="将级联删除其全部 models，不可撤销"
									okText="删除"
									okButtonProps={{ danger: true }}
									cancelText="取消"
									onConfirm={() => onDelete(p)}
								>
									<Button size="small" type="link" danger>
										删除
									</Button>
								</Popconfirm>
							</div>
						</div>
					))
				)}
			</div>

			<div className="tips-card">
				<div className="tips-title">
					配置提示
					<span className="tips-dot" />
				</div>
				{TIPS.map((tip) => (
					<div key={tip} className="tips-item">
						<span className="tips-bullet" />
						<span>{tip}</span>
					</div>
				))}
			</div>
		</section>
	);
}

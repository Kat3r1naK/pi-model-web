/** Model 编辑抽屉：基础字段 + 高级设置（Thinking / Sampling / Headers / compat）+ 费用 */
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Switch } from "antd";
import { useEffect, useMemo, useState } from "react";
import { saveModel } from "../api/model";
import type { SaveModelPayload } from "../api/model/types";
import { API_TYPES, type ModelInfo } from "../api/config/types";

interface ModelDrawerProps {
	open: boolean;
	providerId: string | null;
	model: ModelInfo | null;
	onClose: () => void;
	onSaved: (refreshError?: string) => void;
	onError: (message: string) => void;
}

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
const KNOWN_THINKING_VALUES = [...THINKING_LEVELS, "enabled", "on", "adaptive"];
const SAMPLING_FIELDS = [
	{ key: "temperature", label: "Temperature", placeholder: "如 0.7" },
	{ key: "top_p", label: "Top P", placeholder: "如 0.95" },
	{ key: "top_k", label: "Top K", placeholder: "可选" },
	{ key: "min_p", label: "Min P", placeholder: "可选" },
	{ key: "repetition_penalty", label: "Repetition Penalty", placeholder: "可选" },
	{ key: "seed", label: "Seed", placeholder: "可选" },
	{ key: "frequency_penalty", label: "Frequency Penalty", placeholder: "可选" },
	{ key: "presence_penalty", label: "Presence Penalty", placeholder: "可选" },
] as const;

const HIGH_MAX_MAP: Record<string, string | null> = {
	off: null,
	minimal: null,
	low: null,
	medium: null,
	high: "high",
	xhigh: null,
	max: "max",
};

function sameMap(actual: Record<string, string | null> | undefined, expected: Record<string, string | null>): boolean {
	if (!actual || Object.keys(actual).length !== Object.keys(expected).length) return false;
	return Object.keys(expected).every((key) => actual[key] === expected[key]);
}

/** 已有 map → 预设模式 + 自定义行数据 */
function parseThinkingMap(map: Record<string, string | null> | undefined): {
	preset: string;
	rows: Record<string, { mode: string; custom?: string }>;
} {
	if (!map || Object.keys(map).length === 0) return { preset: "default", rows: {} };
	const all: Record<string, string | null> = {};
	THINKING_LEVELS.forEach((level) => {
		all[level] = level;
	});
	if (sameMap(map, all)) return { preset: "all", rows: {} };
	if (sameMap(map, HIGH_MAX_MAP)) return { preset: "high-max", rows: {} };
	const rows: Record<string, { mode: string; custom?: string }> = {};
	THINKING_LEVELS.forEach((level) => {
		if (!Object.prototype.hasOwnProperty.call(map, level)) return;
		const value = map[level];
		if (value === null) rows[level] = { mode: "__unsupported__" };
		else if (KNOWN_THINKING_VALUES.includes(value)) rows[level] = { mode: value };
		else rows[level] = { mode: "__custom__", custom: value };
	});
	return { preset: "custom", rows };
}

/** 表单数据 → thinkingLevelMap */
function collectThinkingMap(
	preset: string,
	rows: Record<string, { mode?: string; custom?: string }> | undefined,
): Record<string, string | null> | undefined {
	if (preset === "default" || !preset) return undefined;
	if (preset === "all") {
		const all: Record<string, string | null> = {};
		THINKING_LEVELS.forEach((level) => {
			all[level] = level;
		});
		return all;
	}
	if (preset === "high-max") return { ...HIGH_MAX_MAP };
	const result: Record<string, string | null> = {};
	for (const level of THINKING_LEVELS) {
		const row = rows?.[level];
		if (!row?.mode) continue;
		if (row.mode === "__unsupported__") result[level] = null;
		else if (row.mode === "__custom__") {
			if (row.custom?.trim()) result[level] = row.custom.trim();
		} else result[level] = row.mode;
	}
	return Object.keys(result).length ? result : undefined;
}

export default function ModelDrawer({ open, providerId, model, onClose, onSaved, onError }: ModelDrawerProps) {
	const [form] = Form.useForm();
	const [saving, setSaving] = useState(false);
	const editing = Boolean(model);
	const thinkingPreset = Form.useWatch("thinkingPreset", form);

	const unknownSamplingKeys = useMemo(() => {
		if (!model) return [];
		return Object.keys(model.samplingParams).filter(
			(key) => !SAMPLING_FIELDS.some((field) => field.key === key),
		);
	}, [model]);

	useEffect(() => {
		if (!open) return;
		form.resetFields();
		if (!model) return;
		const thinking = parseThinkingMap(model.thinkingLevelMap);
		form.setFieldsValue({
			id: model.id,
			name: model.name === model.id ? "" : model.name,
			api: model.api || "",
			baseUrl: model.baseUrl,
			contextWindow: model.contextWindow,
			maxTokens: model.maxTokens,
			reasoning: model.reasoning,
			imageInput: model.input.includes("image"),
			thinkingPreset: thinking.preset,
			thinkingRows: thinking.rows,
			sampling: Object.fromEntries(
				SAMPLING_FIELDS.filter((field) => field.key in model.samplingParams).map((field) => [
					field.key,
					model.samplingParams[field.key],
				]),
			),
			// 已有 Headers 值脱敏不回显，给一个空行方便新增
			headers: model.headersSet ? [{ name: "", value: "" }] : [],
			compatJson: Object.keys(model.compat).length ? JSON.stringify(model.compat, null, 2) : "",
			cost: {
				input: model.cost.input,
				output: model.cost.output,
				cacheRead: model.cost.cacheRead,
				cacheWrite: model.cost.cacheWrite,
			},
			tiers: model.cost.tiers,
		});
	}, [open, model, form]);

	const handleFinish = async (values: Record<string, unknown>) => {
		if (!providerId) {
			onError("请先添加并选择 provider");
			return;
		}
		const v = values as {
			id: string;
			name?: string;
			api?: string;
			baseUrl?: string;
			contextWindow?: number;
			maxTokens?: number;
			reasoning?: boolean;
			imageInput?: boolean;
			thinkingPreset?: string;
			thinkingRows?: Record<string, { mode?: string; custom?: string }>;
			sampling?: Record<string, number | undefined>;
			headers?: Array<{ name?: string; value?: string }>;
			compatJson?: string;
			cost?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
			tiers?: Array<Record<string, number | undefined>>;
			clearApi?: boolean;
			clearBaseUrl?: boolean;
			clearThinkingLevelMap?: boolean;
			clearSamplingParams?: boolean;
			clearHeaders?: boolean;
			clearCompat?: boolean;
			clearCostTiers?: boolean;
		};
		const samplingParams: Record<string, number> = {};
		for (const field of SAMPLING_FIELDS) {
			const value = v.sampling?.[field.key];
			if (value !== undefined && value !== null && Number.isFinite(value)) samplingParams[field.key] = value;
		}
		const headers: Record<string, string> = {};
		for (const row of v.headers ?? []) {
			if (row?.name?.trim() && row.value) headers[row.name.trim()] = row.value;
		}
		const tiers = (v.tiers ?? []).filter(
			(tier) => tier?.inputTokensAbove !== undefined && tier.inputTokensAbove !== null,
		);
		const payload: SaveModelPayload = {
			provider: providerId,
			...(model ? { originalId: model.id } : {}),
			id: v.id,
			name: v.name,
			api: v.api || undefined,
			baseUrl: v.baseUrl,
			reasoning: Boolean(v.reasoning),
			input: v.imageInput ? ["text", "image"] : ["text"],
			contextWindow: v.contextWindow,
			maxTokens: v.maxTokens,
			thinkingLevelMap: collectThinkingMap(v.thinkingPreset ?? "default", v.thinkingRows),
			samplingParams: Object.keys(samplingParams).length ? samplingParams : undefined,
			headers: Object.keys(headers).length ? headers : undefined,
			compatJson: v.compatJson?.trim() || undefined,
			cost: {
				input: v.cost?.input ?? 0,
				output: v.cost?.output ?? 0,
				cacheRead: v.cost?.cacheRead ?? 0,
				cacheWrite: v.cost?.cacheWrite ?? 0,
			},
			costTiers: tiers.length
				? tiers.map((tier) => ({
						inputTokensAbove: Number(tier.inputTokensAbove),
						input: Number(tier.input ?? 0),
						output: Number(tier.output ?? 0),
						cacheRead: Number(tier.cacheRead ?? 0),
						cacheWrite: Number(tier.cacheWrite ?? 0),
					}))
				: undefined,
			clearApi: v.clearApi,
			clearBaseUrl: v.clearBaseUrl,
			clearThinkingLevelMap: v.clearThinkingLevelMap,
			clearSamplingParams: v.clearSamplingParams,
			clearHeaders: v.clearHeaders,
			clearCompat: v.clearCompat,
			clearCostTiers: v.clearCostTiers,
		};
		setSaving(true);
		try {
			const result = await saveModel(payload);
			onSaved(result.refreshError);
		} catch (error) {
			onError(error instanceof Error ? error.message : String(error));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Drawer
			title={editing ? `编辑 Model · ${model?.id}` : "新建 Model"}
			width={640}
			open={open}
			onClose={onClose}
			destroyOnHidden
			extra={
				<Button type="text" onClick={onClose}>
					取消编辑
				</Button>
			}
			footer={
				<Button type="primary" size="large" block loading={saving} onClick={() => form.submit()}>
					保存 Model
				</Button>
			}
		>
			<Form
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				initialValues={{
					api: "",
					contextWindow: 128_000,
					maxTokens: 16_384,
					reasoning: false,
					imageInput: false,
					thinkingPreset: "default",
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				}}
			>
				<Row gutter={12}>
					<Col span={12}>
						<Form.Item label="Model ID" name="id" rules={[{ required: true, message: "Model ID 不能为空" }]}>
							<Input placeholder="例如 claude-sonnet-4-5" />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label="显示名称" name="name">
							<Input placeholder="可选" />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label="API 覆盖" name="api">
							<Select
								options={[
									{ value: "", label: "使用 Provider 默认" },
									...API_TYPES.map((api) => ({ value: api, label: api })),
								]}
							/>
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label="Base URL 覆盖" name="baseUrl">
							<Input placeholder="留空使用 Provider 地址" />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label="Context Window" name="contextWindow">
							<InputNumber min={1} max={10_000_000} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label="Max Tokens" name="maxTokens">
							<InputNumber min={1} max={10_000_000} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
				</Row>
				<Space size={28}>
					<Form.Item name="reasoning" valuePropName="checked" label="支持 reasoning / thinking">
						<Switch />
					</Form.Item>
					<Form.Item name="imageInput" valuePropName="checked" label="支持图片输入">
						<Switch />
					</Form.Item>
				</Space>

				<div className="drawer-section">
					<div className="drawer-section-title">高级设置</div>
					<p className="drawer-section-note">不确定时保持默认即可；清除已有配置请勾选对应的清除选项。</p>

					<Form.Item label="Thinking 模式" name="thinkingPreset">
						<Select
							options={[
								{ value: "default", label: "默认映射（推荐）" },
								{ value: "all", label: "支持全部等级" },
								{ value: "high-max", label: "只支持 high / max" },
								{ value: "custom", label: "自定义等级" },
							]}
						/>
					</Form.Item>
					{thinkingPreset === "custom" && (
						<div className="thinking-rows">
							{THINKING_LEVELS.map((level) => (
								<div key={level} className="thinking-row">
									<span className="thinking-level">{level}</span>
									<Form.Item name={["thinkingRows", level, "mode"]} noStyle>
										<Select
											className="thinking-select"
											options={[
												{ value: "", label: "默认" },
												{ value: "__unsupported__", label: "不支持" },
												...KNOWN_THINKING_VALUES.map((value) => ({ value, label: value })),
												{ value: "__custom__", label: "自定义值" },
											]}
										/>
									</Form.Item>
									<Form.Item name={["thinkingRows", level, "custom"]} noStyle>
										<Input placeholder="发送给服务商的值" style={{ flex: 1 }} />
									</Form.Item>
								</div>
							))}
						</div>
					)}
					<Form.Item name="clearThinkingLevelMap" valuePropName="checked">
						<Checkbox>清除 thinkingLevelMap</Checkbox>
					</Form.Item>

					<div className="drawer-subtitle">Sampling 参数</div>
					<Row gutter={12}>
						{SAMPLING_FIELDS.map((field) => (
							<Col span={12} key={field.key}>
								<Form.Item label={field.label} name={["sampling", field.key]}>
									<InputNumber placeholder={field.placeholder} step="any" style={{ width: "100%" }} />
								</Form.Item>
							</Col>
						))}
					</Row>
					{unknownSamplingKeys.length > 0 && (
						<p className="drawer-section-note">已有其他采样参数（{unknownSamplingKeys.join(", ")}），保存时会保留。</p>
					)}
					<Form.Item name="clearSamplingParams" valuePropName="checked">
						<Checkbox>清除全部 samplingParams</Checkbox>
					</Form.Item>

					<div className="drawer-subtitle">Model Headers</div>
					<p className="drawer-section-note">已有 Header 值不会回显；留空会保留，新增 Header 会合并进去。</p>
					<Form.List name="headers">
						{(fields, { add, remove }) => (
							<>
								{fields.map(({ key, name }) => (
									<Space.Compact key={key} className="header-row">
										<Form.Item name={[name, "name"]} noStyle>
											<Input placeholder="Header 名称" />
										</Form.Item>
										<Form.Item name={[name, "value"]} noStyle>
											<Input placeholder="Header 值" />
										</Form.Item>
										<Button icon={<DeleteOutlined />} danger onClick={() => remove(name)} />
									</Space.Compact>
								))}
								<Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
									添加 Header
								</Button>
							</>
						)}
					</Form.List>
					<Form.Item name="clearHeaders" valuePropName="checked" className="clear-inline">
						<Checkbox>清除全部 Model Headers</Checkbox>
					</Form.Item>

					<div className="drawer-subtitle">Model compat</div>
					<Form.Item name="compatJson">
						<Input.TextArea rows={2} placeholder='例如 {"supportsDeveloperRole":false,"maxTokensField":"max_tokens"}' />
					</Form.Item>
					<Form.Item name="clearCompat" valuePropName="checked">
						<Checkbox>清除 Model compat</Checkbox>
					</Form.Item>
				</div>

				<div className="drawer-section">
					<div className="drawer-section-title">费用（美元 / 1M tokens）</div>
					<Row gutter={12}>
						{(
							[
								["input", "Input"],
								["output", "Output"],
								["cacheRead", "Cache Read"],
								["cacheWrite", "Cache Write"],
							] as const
						).map(([key, label]) => (
							<Col span={12} key={key}>
								<Form.Item label={label} name={["cost", key]}>
									<InputNumber min={0} max={1_000_000} step="any" style={{ width: "100%" }} />
								</Form.Item>
							</Col>
						))}
					</Row>
					<div className="drawer-subtitle">分层价格 cost.tiers</div>
					<p className="drawer-section-note">当输入 token 超过指定阈值时，使用该价格层统计费用。</p>
					<Form.List name="tiers">
						{(fields, { add, remove }) => (
							<>
								{fields.map(({ key, name }) => (
									<Space.Compact key={key} className="tier-row">
										<Form.Item name={[name, "inputTokensAbove"]} noStyle>
											<InputNumber min={0} placeholder="超过输入 tokens" style={{ width: "100%" }} />
										</Form.Item>
										<Form.Item name={[name, "input"]} noStyle>
											<InputNumber min={0} placeholder="Input" style={{ width: "100%" }} />
										</Form.Item>
										<Form.Item name={[name, "output"]} noStyle>
											<InputNumber min={0} placeholder="Output" style={{ width: "100%" }} />
										</Form.Item>
										<Form.Item name={[name, "cacheRead"]} noStyle>
											<InputNumber min={0} placeholder="Cache Read" style={{ width: "100%" }} />
										</Form.Item>
										<Form.Item name={[name, "cacheWrite"]} noStyle>
											<InputNumber min={0} placeholder="Cache Write" style={{ width: "100%" }} />
										</Form.Item>
										<Button icon={<DeleteOutlined />} danger onClick={() => remove(name)} />
									</Space.Compact>
								))}
								<Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
									添加价格层
								</Button>
							</>
						)}
					</Form.List>
					<Form.Item name="clearCostTiers" valuePropName="checked" className="clear-inline">
						<Checkbox>清除 cost.tiers</Checkbox>
					</Form.Item>
				</div>

				{editing && (
					<div className="clear-group">
						<div className="clear-group-title">其他清除项</div>
						<Space size={16}>
							<Form.Item name="clearApi" valuePropName="checked" noStyle>
								<Checkbox>清除 API 覆盖</Checkbox>
							</Form.Item>
							<Form.Item name="clearBaseUrl" valuePropName="checked" noStyle>
								<Checkbox>清除 Base URL 覆盖</Checkbox>
							</Form.Item>
						</Space>
					</div>
				)}
			</Form>
		</Drawer>
	);
}

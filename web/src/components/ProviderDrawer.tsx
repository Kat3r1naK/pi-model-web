/** Provider 编辑抽屉：新建/编辑共用，字段语义 = 留空保留原值 + clearXxx 显式清除 */
import { Button, Checkbox, Drawer, Form, Input, Select, Space, Switch } from "antd";
import { useEffect, useState } from "react";
import { saveProvider } from "../api/provider";
import { API_TYPES, type ProviderInfo } from "../api/config/types";
import type { SaveProviderPayload } from "../api/provider/types";

interface ProviderDrawerProps {
	open: boolean;
	provider: ProviderInfo | null;
	onClose: () => void;
	onSaved: (id: string, refreshError?: string) => void;
	onError: (message: string) => void;
}

function jsonText(value: Record<string, unknown> | undefined): string {
	if (!value || Object.keys(value).length === 0) return "";
	return JSON.stringify(value, null, 2);
}

export default function ProviderDrawer({ open, provider, onClose, onSaved, onError }: ProviderDrawerProps) {
	const [form] = Form.useForm();
	const [saving, setSaving] = useState(false);
	const editing = Boolean(provider);

	useEffect(() => {
		if (!open) return;
		form.resetFields();
		if (!provider) return;
		form.setFieldsValue({
			id: provider.id,
			name: provider.name === provider.id ? "" : provider.name,
			baseUrl: provider.baseUrl,
			api: provider.api || "",
			oauth: provider.oauth || "",
			authHeader: provider.authHeader,
			// apiKey 与 headers 值脱敏不回显：留空 = 保留原值
			compatJson: jsonText(provider.compat),
			modelOverridesJson: jsonText(provider.modelOverrides),
		});
	}, [open, provider, form]);

	const handleFinish = async (values: Record<string, unknown>) => {
		const v = values as {
			id: string;
			name?: string;
			baseUrl?: string;
			api?: string;
			oauth?: string;
			apiKey?: string;
			authHeader?: boolean;
			headersJson?: string;
			compatJson?: string;
			modelOverridesJson?: string;
			clearBaseUrl?: boolean;
			clearApi?: boolean;
			clearApiKey?: boolean;
			clearHeaders?: boolean;
			clearCompat?: boolean;
			clearModelOverrides?: boolean;
		};
		const payload: SaveProviderPayload = {
			...(provider ? { originalId: provider.id } : {}),
			id: v.id,
			name: v.name,
			baseUrl: v.baseUrl,
			api: v.api || undefined,
			oauth: (v.oauth === "radius" ? "radius" : "") as "" | "radius",
			apiKey: v.apiKey || undefined,
			authHeader: Boolean(v.authHeader),
			headersJson: v.headersJson?.trim() || undefined,
			compatJson: v.compatJson?.trim() || undefined,
			modelOverridesJson: v.modelOverridesJson?.trim() || undefined,
			clearBaseUrl: v.clearBaseUrl,
			clearApi: v.clearApi,
			clearApiKey: v.clearApiKey,
			clearHeaders: v.clearHeaders,
			clearCompat: v.clearCompat,
			clearModelOverrides: v.clearModelOverrides,
		};
		setSaving(true);
		try {
			const result = await saveProvider(payload);
			onSaved(result.id, result.refreshError);
		} catch (error) {
			onError(error instanceof Error ? error.message : String(error));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Drawer
			title={editing ? `编辑 Provider · ${provider?.id}` : "新建 Provider"}
			width={520}
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
					保存 Provider
				</Button>
			}
		>
			<Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ oauth: "", authHeader: false }}>
				<Form.Item
					label="Provider ID"
					name="id"
					rules={[
						{ required: true, message: "Provider ID 不能为空" },
						{ pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/, message: "只能包含字母、数字、点、下划线和连字符" },
					]}
				>
					<Input placeholder="例如 openrouter" />
				</Form.Item>
				<Form.Item label="显示名称" name="name">
					<Input placeholder="例如 OpenRouter" />
				</Form.Item>
				<Form.Item label="Base URL" name="baseUrl">
					<Input placeholder="https://api.example.com/v1" />
				</Form.Item>
				<Form.Item label="默认 API 类型" name="api">
					<Select
						options={[{ value: "", label: "使用模型级 / 内置默认" }, ...API_TYPES.map((api) => ({ value: api, label: api }))]}
					/>
				</Form.Item>
				<Form.Item label="OAuth" name="oauth" extra="启用 radius OAuth 时需要填写 Base URL">
					<Select
						options={[
							{ value: "", label: "无 OAuth" },
							{ value: "radius", label: "radius" },
						]}
					/>
				</Form.Item>
				<Form.Item
					label="API Key"
					name="apiKey"
					extra={editing && provider?.apiKeySet ? "已保存 key；留空则保留原值" : "支持环境变量引用，如 $OPENAI_KEY"}
				>
					<Input.Password autoComplete="new-password" placeholder="留空则保留已有 key" />
				</Form.Item>
				<Form.Item label="自动添加 Authorization: Bearer" name="authHeader" valuePropName="checked">
					<Switch />
				</Form.Item>
				<Form.Item
					label="Provider Headers JSON"
					name="headersJson"
					extra={editing && provider?.headersSet ? "已有 Headers 不回显；留空保留，填写则整体替换" : undefined}
				>
					<Input.TextArea rows={2} placeholder='例如 {"X-Proxy-Key":"$PROXY_KEY"}' />
				</Form.Item>
				<Form.Item label="Provider compat JSON" name="compatJson">
					<Input.TextArea rows={2} placeholder='例如 {"supportsDeveloperRole":false}' />
				</Form.Item>
				<Form.Item label="modelOverrides JSON" name="modelOverridesJson">
					<Input.TextArea rows={2} placeholder='例如 {"model-id":{"maxTokens":8192}}' />
				</Form.Item>

				{editing && (
					<div className="clear-group">
						<div className="clear-group-title">清除已有配置（勾选后保存即删除对应字段）</div>
						<Space direction="vertical" size={4}>
							<Form.Item name="clearBaseUrl" valuePropName="checked" noStyle>
								<Checkbox>清除 Base URL</Checkbox>
							</Form.Item>
							<Form.Item name="clearApi" valuePropName="checked" noStyle>
								<Checkbox>清除默认 API</Checkbox>
							</Form.Item>
							<Form.Item name="clearApiKey" valuePropName="checked" noStyle>
								<Checkbox>清除已保存 API Key</Checkbox>
							</Form.Item>
							<Form.Item name="clearHeaders" valuePropName="checked" noStyle>
								<Checkbox>清除 Provider Headers</Checkbox>
							</Form.Item>
							<Form.Item name="clearCompat" valuePropName="checked" noStyle>
								<Checkbox>清除 Provider compat</Checkbox>
							</Form.Item>
							<Form.Item name="clearModelOverrides" valuePropName="checked" noStyle>
								<Checkbox>清除 modelOverrides</Checkbox>
							</Form.Item>
						</Space>
					</div>
				)}
			</Form>
		</Drawer>
	);
}

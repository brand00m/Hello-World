import { useState, useEffect, useCallback } from 'react';
import {
  Button, Space, Modal, Form, Input, Select, Collapse, Table, Tag,
  message, Typography, Card, Popconfirm, Empty, Badge,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, FilePdfOutlined, ArrowLeftOutlined,
  ThunderboltOutlined, FileAddOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchSubmittal, createSubmittal, deleteSubmittal,
  addSection, deleteSection, addItemToSection,
  removeItemFromSection, populateFromBom,
  fetchProjectSubmittals,
  type Submittal, type SubmittalSection, type SubmittalItem,
} from '../api/submittals';
import { fetchProject } from '../api/projects';
import { fetchParts } from '../api/parts';
import { fetchCategories } from '../api/categories';
import type { Project, Part, PartCategory } from '../types';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  generated: 'processing',
  submitted: 'blue',
  approved: 'success',
};

export default function SubmittalBuilder() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [activeSubmittal, setActiveSubmittal] = useState<Submittal | null>(null);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [newSubmittalOpen, setNewSubmittalOpen] = useState(false);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [addPartSectionId, setAddPartSectionId] = useState<string | null>(null);

  // Part search
  const [partSearch, setPartSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [form] = Form.useForm();
  const [sectionForm] = Form.useForm();

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await fetchProject(projectId);
      setProject(p);
    } catch {
      message.error('Failed to load project');
    }
  }, [projectId]);

  const loadSubmittals = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const subs = await fetchProjectSubmittals(projectId);
      setSubmittals(subs);
      if (subs.length > 0 && !activeSubmittal) {
        setActiveSubmittal(subs[0]);
      } else if (activeSubmittal) {
        const updated = subs.find(s => s.id === activeSubmittal.id);
        if (updated) setActiveSubmittal(updated);
      }
    } catch {
      message.error('Failed to load submittals');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchCategories());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProject(); loadCategories(); }, [loadProject, loadCategories]);
  useEffect(() => { loadSubmittals(); }, [loadSubmittals]);

  const refreshActive = useCallback(async () => {
    if (!activeSubmittal) return;
    try {
      const updated = await fetchSubmittal(activeSubmittal.id);
      setActiveSubmittal(updated);
      loadSubmittals();
    } catch {
      message.error('Failed to refresh submittal');
    }
  }, [activeSubmittal, loadSubmittals]);

  // Part search debounce
  useEffect(() => {
    if (!partSearch || partSearch.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetchParts({ search: partSearch, limit: 15 });
        setSearchResults(res.data);
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [partSearch]);

  const handleCreateSubmittal = async (values: { title: string }) => {
    if (!projectId) return;
    try {
      const sub = await createSubmittal({ projectId, title: values.title });
      message.success('Submittal created');
      setNewSubmittalOpen(false);
      form.resetFields();
      setActiveSubmittal(sub);
      loadSubmittals();
    } catch {
      message.error('Failed to create submittal');
    }
  };

  const handleDeleteSubmittal = async (id: string) => {
    try {
      await deleteSubmittal(id);
      message.success('Submittal deleted');
      if (activeSubmittal?.id === id) setActiveSubmittal(null);
      loadSubmittals();
    } catch {
      message.error('Failed to delete submittal');
    }
  };

  const handlePopulate = async () => {
    if (!activeSubmittal) return;
    try {
      const result = await populateFromBom(activeSubmittal.id);
      message.success('Populated from BOM');
      setActiveSubmittal(result);
      loadSubmittals();
    } catch {
      message.error('Failed to populate. Make sure the project has BOM items.');
    }
  };

  const handleAddSection = async (values: { title: string; categoryId?: string }) => {
    if (!activeSubmittal) return;
    try {
      await addSection(activeSubmittal.id, values);
      message.success('Section added');
      setNewSectionOpen(false);
      sectionForm.resetFields();
      refreshActive();
    } catch {
      message.error('Failed to add section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!activeSubmittal) return;
    try {
      await deleteSection(activeSubmittal.id, sectionId);
      message.success('Section removed');
      refreshActive();
    } catch {
      message.error('Failed to remove section');
    }
  };

  const handleAddPart = async (part: Part) => {
    if (!activeSubmittal || !addPartSectionId) return;
    try {
      await addItemToSection(activeSubmittal.id, addPartSectionId, { partId: part.id });
      message.success(`Added ${part.model}`);
      refreshActive();
    } catch {
      message.error('Failed to add part');
    }
  };

  const handleRemoveItem = async (sectionId: string, itemId: string) => {
    if (!activeSubmittal) return;
    try {
      await removeItemFromSection(activeSubmittal.id, sectionId, itemId);
      refreshActive();
    } catch {
      message.error('Failed to remove item');
    }
  };

  const handleGeneratePdf = () => {
    if (!activeSubmittal) return;
    window.open(`/api/submittals/${activeSubmittal.id}/pdf`, '_blank');
  };

  const itemColumns: ColumnsType<SubmittalItem> = [
    { title: '#', width: 40, render: (_: unknown, __: unknown, idx: number) => idx + 1 },
    {
      title: 'Name',
      render: (_: unknown, record: SubmittalItem) => (
        <span style={{ fontWeight: 500 }}>{record.part.submittalName || record.part.description}</span>
      ),
    },
    { title: 'Model', dataIndex: ['part', 'model'], width: 180, ellipsis: true },
    { title: 'Manufacturer', dataIndex: ['part', 'manufacturer', 'name'], width: 130 },
    {
      title: 'Spec',
      width: 100,
      render: (_: unknown, record: SubmittalItem) => record.specOverride || record.part.specSection || '-',
    },
    {
      title: '',
      width: 40,
      render: (_: unknown, record: SubmittalItem) => (
        <Popconfirm title="Remove?" onConfirm={() => handleRemoveItem(record.sectionId, record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} type="text" />
        </Popconfirm>
      ),
    },
  ];

  if (!project) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)}>
          Back to Project
        </Button>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Submittals</Title>
          <Text type="secondary">{project.jobName} — Job #{project.jobNumber || 'N/A'}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewSubmittalOpen(true)}>
          New Submittal
        </Button>
      </div>

      {/* Submittal selector */}
      {submittals.length > 0 && (
        <Space wrap style={{ marginBottom: 16 }}>
          {submittals.map(sub => (
            <Card
              key={sub.id}
              size="small"
              hoverable
              style={{
                borderColor: activeSubmittal?.id === sub.id ? '#1890ff' : undefined,
                borderWidth: activeSubmittal?.id === sub.id ? 2 : 1,
              }}
              onClick={() => setActiveSubmittal(sub)}
            >
              <Space>
                <Badge status={sub.status === 'generated' ? 'processing' : sub.status === 'approved' ? 'success' : 'default'} />
                <Text strong>{sub.title}</Text>
                <Tag color={STATUS_COLORS[sub.status]}>{sub.status}</Tag>
                <Text type="secondary">{sub.sections.reduce((s, sec) => s + sec.items.length, 0)} items</Text>
                <Popconfirm title="Delete this submittal?" onConfirm={() => handleDeleteSubmittal(sub.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={e => e.stopPropagation()} />
                </Popconfirm>
              </Space>
            </Card>
          ))}
        </Space>
      )}

      {/* Active submittal content */}
      {activeSubmittal ? (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button icon={<ThunderboltOutlined />} onClick={handlePopulate} disabled={activeSubmittal.sections.length > 0}>
              Auto-populate from BOM
            </Button>
            <Button icon={<FileAddOutlined />} onClick={() => setNewSectionOpen(true)}>
              Add Section
            </Button>
            <Button icon={<FilePdfOutlined />} type="primary" onClick={handleGeneratePdf} disabled={activeSubmittal.sections.length === 0}>
              Generate PDF
            </Button>
          </Space>

          {activeSubmittal.sections.length === 0 ? (
            <Empty description="No sections yet. Auto-populate from BOM or add sections manually." />
          ) : (
            <Collapse
              defaultActiveKey={activeSubmittal.sections.map(s => s.id)}
              items={activeSubmittal.sections.map((section, idx) => ({
                key: section.id,
                label: (
                  <Space>
                    <Text strong>Section {idx + 1}: {section.title}</Text>
                    {section.category && <Tag>{section.category.name}</Tag>}
                    <Text type="secondary">{section.items.length} items</Text>
                  </Space>
                ),
                extra: (
                  <Space onClick={e => e.stopPropagation()}>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => { setAddPartSectionId(section.id); setAddPartOpen(true); }}
                    >
                      Add Part
                    </Button>
                    <Popconfirm title="Delete section?" onConfirm={() => handleDeleteSection(section.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
                children: (
                  <Table
                    dataSource={section.items}
                    columns={itemColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ),
              }))}
            />
          )}
        </div>
      ) : submittals.length === 0 ? (
        <Empty description="No submittals yet. Create one to get started." />
      ) : null}

      {/* New Submittal Modal */}
      <Modal
        title="New Submittal"
        open={newSubmittalOpen}
        onCancel={() => { setNewSubmittalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmittal}>
          <Form.Item name="title" label="Submittal Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Controls Submittal Rev. A" />
          </Form.Item>
        </Form>
      </Modal>

      {/* New Section Modal */}
      <Modal
        title="Add Section"
        open={newSectionOpen}
        onCancel={() => { setNewSectionOpen(false); sectionForm.resetFields(); }}
        onOk={() => sectionForm.submit()}
      >
        <Form form={sectionForm} layout="vertical" onFinish={handleAddSection}>
          <Form.Item name="title" label="Section Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Field Peripheral Devices" />
          </Form.Item>
          <Form.Item name="categoryId" label="Category (optional)">
            <Select
              allowClear
              placeholder="Link to a part category"
              options={categories.map(c => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Part Modal */}
      <Modal
        title="Add Part to Section"
        open={addPartOpen}
        onCancel={() => { setAddPartOpen(false); setPartSearch(''); setSearchResults([]); }}
        footer={null}
        width={700}
      >
        <Input
          placeholder="Search parts by description, model..."
          prefix={<SearchOutlined />}
          value={partSearch}
          onChange={e => setPartSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={searchResults}
          rowKey="id"
          size="small"
          loading={searchLoading}
          pagination={false}
          scroll={{ y: 350 }}
          columns={[
            { title: 'Description', dataIndex: 'description', ellipsis: true },
            { title: 'Model', dataIndex: 'model', width: 150, ellipsis: true },
            { title: 'Manufacturer', dataIndex: ['manufacturer', 'name'], width: 120 },
            {
              title: '',
              width: 70,
              render: (_: unknown, record: Part) => (
                <Button size="small" type="primary" onClick={() => handleAddPart(record)}>Add</Button>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}

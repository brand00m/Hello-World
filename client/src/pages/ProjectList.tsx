import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, DatePicker, Tag, message, Tooltip, Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api/projects';
import type { Project } from '../types';
import dayjs from 'dayjs';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  submitted: 'processing',
  approved: 'success',
  revised: 'warning',
};

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await fetchProjects());
    } catch {
      message.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      submittalDate: values.submittalDate ? (values.submittalDate as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
        message.success('Project updated');
      } else {
        await createProject(data as { jobName: string });
        message.success('Project created');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingProject(null);
      loadProjects();
    } catch {
      message.error('Failed to save project');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      message.success('Project deleted');
      loadProjects();
    } catch {
      message.error('Failed to delete project');
    }
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      ...project,
      submittalDate: project.submittalDate ? dayjs(project.submittalDate) : undefined,
    });
    setModalOpen(true);
  };

  const columns: ColumnsType<Project> = [
    { title: 'Job Name', dataIndex: 'jobName', sorter: (a, b) => a.jobName.localeCompare(b.jobName) },
    { title: 'Job #', dataIndex: 'jobNumber', width: 120 },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{s.toUpperCase()}</Tag>,
    },
    { title: 'BOM Items', dataIndex: ['_count', 'bomItems'], width: 100, align: 'center' },
    { title: 'Submittals', dataIndex: ['_count', 'submittals'], width: 100, align: 'center' },
    {
      title: 'Date',
      dataIndex: 'submittalDate',
      width: 120,
      render: (d: string | null) => d ? dayjs(d).format('MM/DD/YYYY') : '-',
    },
    {
      title: 'Actions',
      width: 140,
      render: (_: unknown, record: Project) => (
        <Space size="small">
          <Tooltip title="Open BOM">
            <Button size="small" type="primary" icon={<FolderOpenOutlined />} onClick={() => navigate(`/projects/${record.id}`)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => Modal.confirm({
                title: 'Delete Project?',
                content: `Delete "${record.jobName}" and all BOM items?`,
                onOk: () => handleDelete(record.id),
              })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Projects</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProject(null); form.resetFields(); setModalOpen(true); }}>
          New Project
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} projects` }}
      />

      <Modal
        title={editingProject ? 'Edit Project' : 'New Project'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingProject(null); form.resetFields(); }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="jobName" label="Job Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="jobNumber" label="Job Number" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="submittalDate" label="Submittal Date" style={{ width: 200 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}

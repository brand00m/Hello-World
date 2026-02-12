import { useState, useEffect, useCallback } from 'react';
import {
  Table, Input, Button, Space, Modal, Form, InputNumber, message, Tooltip, Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchVendors, createVendor, updateVendor, deleteVendor } from '../api/vendors';
import type { Vendor } from '../types';

const { Title } = Typography;

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form] = Form.useForm();

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVendors(search || undefined);
      setVendors(data);
    } catch {
      message.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, values);
        message.success('Vendor updated');
      } else {
        await createVendor(values);
        message.success('Vendor created');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingVendor(null);
      loadVendors();
    } catch {
      message.error('Failed to save vendor');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVendor(id);
      message.success('Vendor deleted');
      loadVendors();
    } catch {
      message.error('Failed to delete vendor');
    }
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    form.setFieldsValue(vendor);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingVendor(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns: ColumnsType<Vendor> = [
    { title: 'Company Name', dataIndex: 'companyName', sorter: (a, b) => a.companyName.localeCompare(b.companyName) },
    { title: 'Contact', dataIndex: 'contactName', width: 150 },
    { title: 'Email', dataIndex: 'contactEmail', width: 200, ellipsis: true },
    { title: 'Phone', dataIndex: 'phone', width: 140 },
    { title: 'Multiplier', dataIndex: 'multiplier', width: 100, render: (v: number | null) => v ?? '-' },
    { title: 'NetSuite ID', dataIndex: 'netsuiteId', width: 120 },
    { title: 'Parts', dataIndex: ['_count', 'parts'], width: 80, align: 'center' },
    {
      title: 'Actions',
      width: 100,
      render: (_: unknown, record: Vendor) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => Modal.confirm({
                title: 'Delete Vendor?',
                content: `Delete "${record.companyName}"? This vendor has ${record._count?.parts || 0} linked parts.`,
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
        <Title level={3} style={{ margin: 0 }}>Vendors</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Vendor
        </Button>
      </div>

      <Input
        placeholder="Search vendors..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 300, marginBottom: 16 }}
        allowClear
      />

      <Table
        columns={columns}
        dataSource={vendors}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (t) => `${t} vendors` }}
      />

      <Modal
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingVendor(null); form.resetFields(); }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="contactName" label="Contact Name" style={{ width: 250 }}>
              <Input />
            </Form.Item>
            <Form.Item name="contactEmail" label="Contact Email" style={{ width: 250 }}>
              <Input type="email" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="phone" label="Phone" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="multiplier" label="Multiplier" style={{ width: 150 }}>
              <InputNumber step={0.01} precision={4} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="netsuiteId" label="NetSuite ID" style={{ width: 150 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="addressLine1" label="Address Line 1">
            <Input />
          </Form.Item>
          <Form.Item name="addressLine2" label="Address Line 2">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

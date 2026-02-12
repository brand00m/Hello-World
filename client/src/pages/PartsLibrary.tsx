import { useState, useEffect, useCallback } from 'react';
import {
  Table, Input, Select, Button, Space, Tag, Modal, Form,
  InputNumber, Switch, message, Tooltip, Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchParts, createPart, updatePart, deletePart } from '../api/parts';
import { fetchVendors } from '../api/vendors';
import { fetchManufacturers } from '../api/manufacturers';
import { fetchCategories } from '../api/categories';
import type { Part, Vendor, Manufacturer, PartCategory } from '../types';

const { Title } = Typography;

export default function PartsLibrary() {
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>();
  const [vendorId, setVendorId] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [form] = Form.useForm();

  const loadParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchParts({
        search: search || undefined,
        categoryId,
        vendorId,
        page,
        limit: pageSize,
      });
      setParts(res.data);
      setTotal(res.pagination.total);
    } catch {
      message.error('Failed to load parts');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, vendorId, page, pageSize]);

  const loadFilters = useCallback(async () => {
    const [v, m, c] = await Promise.all([
      fetchVendors(),
      fetchManufacturers(),
      fetchCategories(),
    ]);
    setVendors(v);
    setManufacturers(m);
    setCategories(c);
  }, []);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadParts(); }, [loadParts]);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editingPart) {
        await updatePart(editingPart.id, values);
        message.success('Part updated');
      } else {
        await createPart(values);
        message.success('Part created');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingPart(null);
      loadParts();
    } catch {
      message.error('Failed to save part');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePart(id);
      message.success('Part deleted');
      loadParts();
    } catch {
      message.error('Failed to delete part');
    }
  };

  const openEdit = (part: Part) => {
    setEditingPart(part);
    form.setFieldsValue(part);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingPart(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns: ColumnsType<Part> = [
    {
      title: 'Description',
      dataIndex: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Manufacturer',
      dataIndex: ['manufacturer', 'name'],
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Vendor',
      dataIndex: ['vendor', 'companyName'],
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: ['category', 'name'],
      width: 160,
      render: (name: string) => name ? <Tag>{name}</Tag> : '-',
    },
    {
      title: 'List Price',
      dataIndex: 'listPrice',
      width: 100,
      align: 'right',
      render: (v: number | null) => v != null ? `$${Number(v).toFixed(2)}` : '-',
    },
    {
      title: 'Disc. Price',
      dataIndex: 'discountPrice',
      width: 100,
      align: 'right',
      render: (v: number | null) => v != null ? `$${Number(v).toFixed(2)}` : '-',
    },
    {
      title: 'Spec',
      dataIndex: 'specSection',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Actions',
      width: 100,
      fixed: 'right',
      render: (_: unknown, record: Part) => (
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
                title: 'Delete Part?',
                content: `Delete "${record.description}"?`,
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
        <Title level={3} style={{ margin: 0 }}>Parts Library</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Part
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search parts..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="Category"
          value={categoryId}
          onChange={(v) => { setCategoryId(v); setPage(1); }}
          allowClear
          style={{ width: 200 }}
          options={categories.map((c) => ({ label: `${c.name} (${c._count?.parts || 0})`, value: c.id }))}
        />
        <Select
          placeholder="Vendor"
          value={vendorId}
          onChange={(v) => { setVendorId(v); setPage(1); }}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          options={vendors.map((v) => ({ label: `${v.companyName} (${v._count?.parts || 0})`, value: v.id }))}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={parts}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100', '200'],
          showTotal: (t) => `${t} parts`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        size="small"
      />

      <Modal
        title={editingPart ? 'Edit Part' : 'Add Part'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingPart(null); form.resetFields(); }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="model" label="Model Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="manufacturerId" label="Manufacturer" style={{ width: 300 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={manufacturers.map((m) => ({ label: m.name, value: m.id }))}
              />
            </Form.Item>
            <Form.Item name="vendorId" label="Vendor" style={{ width: 300 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={vendors.map((v) => ({ label: v.companyName, value: v.id }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="categoryId" label="Category">
            <Select
              allowClear
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="listPrice" label="List Price">
              <InputNumber prefix="$" precision={2} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="discountPrice" label="Discount Price">
              <InputNumber prefix="$" precision={2} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="priorityRanking" label="Priority">
              <InputNumber style={{ width: 100 }} />
            </Form.Item>
          </Space>
          <Form.Item name="specSection" label="Spec Section">
            <Input placeholder="e.g. 2.8.E, 2.13.B" />
          </Form.Item>
          <Form.Item name="submittalName" label="Submittal Name">
            <Input />
          </Form.Item>
          <Form.Item name="isByOthers" label="By Others" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

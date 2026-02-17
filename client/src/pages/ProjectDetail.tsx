import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Modal, InputNumber, Input, message,
  Typography, Tag, Card, Statistic, Row, Col, Select, Descriptions,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, DownloadOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProject, addBomItem, updateBomItem, deleteBomItem } from '../api/projects';
import { fetchParts, type PartsQuery } from '../api/parts';
import type { Project, BomItem, Part } from '../types';

const { Title, Text } = Typography;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  // Part search for adding to BOM
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [addQty, setAddQty] = useState(1);

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setProject(await fetchProject(id));
    } catch {
      message.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  // Debounced part search
  useEffect(() => {
    if (!partSearch || partSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetchParts({ search: partSearch, limit: 20 });
        setSearchResults(res.data);
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [partSearch]);

  const handleAddToBom = async () => {
    if (!id || !selectedPart) return;
    try {
      await addBomItem(id, {
        partId: selectedPart.id,
        quantity: addQty,
        unitPrice: selectedPart.discountPrice ?? undefined,
      });
      message.success(`Added ${selectedPart.model} to BOM`);
      setAddModalOpen(false);
      setSelectedPart(null);
      setPartSearch('');
      setAddQty(1);
      loadProject();
    } catch {
      message.error('Failed to add item');
    }
  };

  const handleUpdateQty = async (bomItem: BomItem, quantity: number) => {
    if (!id) return;
    try {
      await updateBomItem(id, bomItem.id, { quantity });
      loadProject();
    } catch {
      message.error('Failed to update quantity');
    }
  };

  const handleUpdatePrice = async (bomItem: BomItem, unitPrice: number) => {
    if (!id) return;
    try {
      await updateBomItem(id, bomItem.id, { unitPrice });
      loadProject();
    } catch {
      message.error('Failed to update price');
    }
  };

  const handleDeleteBomItem = async (bomItemId: string) => {
    if (!id) return;
    try {
      await deleteBomItem(id, bomItemId);
      message.success('Item removed');
      loadProject();
    } catch {
      message.error('Failed to remove item');
    }
  };

  const handleExport = () => {
    if (!id) return;
    window.open(`/api/projects/${id}/bom/export`, '_blank');
  };

  if (!project) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  const bomItems = project.bomItems || [];
  const totalCost = bomItems.reduce((sum, item) => {
    const price = item.unitPrice ? Number(item.unitPrice) : (item.part.discountPrice ? Number(item.part.discountPrice) : 0);
    return sum + price * item.quantity;
  }, 0);
  const totalQty = bomItems.reduce((sum, item) => sum + item.quantity, 0);

  const columns: ColumnsType<BomItem> = [
    {
      title: 'Description',
      dataIndex: ['part', 'description'],
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Model',
      dataIndex: ['part', 'model'],
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Manufacturer',
      dataIndex: ['part', 'manufacturer', 'name'],
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Vendor',
      dataIndex: ['part', 'vendor', 'companyName'],
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: ['part', 'category', 'name'],
      width: 140,
      render: (name: string) => name ? <Tag>{name}</Tag> : '-',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 80,
      render: (qty: number, record: BomItem) => (
        <InputNumber
          size="small"
          min={1}
          value={qty}
          onChange={(v) => v && handleUpdateQty(record, v)}
          style={{ width: 60 }}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right',
      render: (price: number | null, record: BomItem) => {
        const val = price ? Number(price) : (record.part.discountPrice ? Number(record.part.discountPrice) : 0);
        return (
          <InputNumber
            size="small"
            prefix="$"
            precision={2}
            value={val}
            onChange={(v) => v !== null && handleUpdatePrice(record, v)}
            style={{ width: 95 }}
          />
        );
      },
    },
    {
      title: 'Ext. Price',
      width: 110,
      align: 'right',
      render: (_: unknown, record: BomItem) => {
        const price = record.unitPrice ? Number(record.unitPrice) : (record.part.discountPrice ? Number(record.part.discountPrice) : 0);
        return `$${(price * record.quantity).toFixed(2)}`;
      },
    },
    {
      title: '',
      width: 50,
      render: (_: unknown, record: BomItem) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => Modal.confirm({
            title: 'Remove from BOM?',
            content: `Remove "${record.part.model}"?`,
            onOk: () => handleDeleteBomItem(record.id),
          })}
        />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{project.jobName}</Title>
          <Text type="secondary">Job #{project.jobNumber || 'N/A'}</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={bomItems.length === 0}>
            Export MR
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            Add Part
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="BOM Items" value={bomItems.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Total Qty" value={totalQty} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Total Cost" value={totalCost} precision={2} prefix="$" />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={bomItems}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300 }}
        size="small"
        pagination={false}
        summary={() => bomItems.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5} />
            <Table.Summary.Cell index={5} align="center">
              <Text strong>{totalQty}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} />
            <Table.Summary.Cell index={7} align="right">
              <Text strong>${totalCost.toFixed(2)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8} />
          </Table.Summary.Row>
        ) : undefined}
      />

      <Modal
        title="Add Part to BOM"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setSelectedPart(null); setPartSearch(''); }}
        onOk={handleAddToBom}
        okButtonProps={{ disabled: !selectedPart }}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input.Search
            placeholder="Search parts by description, model..."
            value={partSearch}
            onChange={(e) => setPartSearch(e.target.value)}
            loading={searchLoading}
            allowClear
          />

          {searchResults.length > 0 && (
            <Table
              dataSource={searchResults}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedPart ? [selectedPart.id] : [],
                onChange: (_, rows) => setSelectedPart(rows[0] || null),
              }}
              columns={[
                { title: 'Description', dataIndex: 'description', ellipsis: true },
                { title: 'Model', dataIndex: 'model', width: 150, ellipsis: true },
                { title: 'Manufacturer', dataIndex: ['manufacturer', 'name'], width: 120 },
                {
                  title: 'Price',
                  dataIndex: 'discountPrice',
                  width: 90,
                  render: (v: number | null) => v != null ? `$${Number(v).toFixed(2)}` : '-',
                },
              ]}
            />
          )}

          {selectedPart && (
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Selected">{selectedPart.description}</Descriptions.Item>
              <Descriptions.Item label="Model">{selectedPart.model}</Descriptions.Item>
              <Descriptions.Item label="Quantity">
                <InputNumber min={1} value={addQty} onChange={(v) => v && setAddQty(v)} />
              </Descriptions.Item>
              <Descriptions.Item label="Unit Price">
                ${selectedPart.discountPrice ? Number(selectedPart.discountPrice).toFixed(2) : '0.00'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </Modal>
    </div>
  );
}

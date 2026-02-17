import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  ToolOutlined, ShopOutlined, DashboardOutlined,
} from '@ant-design/icons';
import PartsLibrary from './pages/PartsLibrary';
import VendorManagement from './pages/VendorManagement';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import SubmittalBuilder from './pages/SubmittalBuilder';

const { Header, Content, Sider } = Layout;

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider width={220} theme="dark">
          <div style={{ padding: '16px 24px', color: '#fff', fontSize: 16, fontWeight: 600 }}>
            Controls Submittal
          </div>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['parts']}>
            <Menu.Item key="parts" icon={<ToolOutlined />}>
              <Link to="/parts">Parts Library</Link>
            </Menu.Item>
            <Menu.Item key="vendors" icon={<ShopOutlined />}>
              <Link to="/vendors">Vendors</Link>
            </Menu.Item>
            <Menu.Item key="projects" icon={<DashboardOutlined />}>
              <Link to="/projects">Projects</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 18, fontWeight: 500 }}>
              Engineering Controls Submittal System
            </span>
          </Header>
          <Content style={{ padding: 24, background: '#fff' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/parts" replace />} />
              <Route path="/parts" element={<PartsLibrary />} />
              <Route path="/vendors" element={<VendorManagement />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:projectId/submittals" element={<SubmittalBuilder />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

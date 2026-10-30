import { useState, useRef } from 'react';
import {
  ReactFlow, Background, Controls, useNodesState, useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: 'dispatch', position: { x: 250, y: 0 }, data: { label: '📤 分发任务' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
  { id: 'run_syntax', position: { x: 50, y: 150 }, data: { label: '🔍 语法检查' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
  { id: 'run_security', position: { x: 250, y: 150 }, data: { label: '🔒 安全审查' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
  { id: 'run_style', position: { x: 450, y: 150 }, data: { label: '🎨 风格建议' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
  { id: 'summarize', position: { x: 250, y: 300 }, data: { label: '📝 汇总报告' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
];

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
  style: { strokeWidth: 2, stroke: '#d1d5db' }
};

const initialEdges = [
  { id: 'e-dispatch-syntax', source: 'dispatch', target: 'run_syntax', ...defaultEdgeOptions },
  { id: 'e-dispatch-security', source: 'dispatch', target: 'run_security', ...defaultEdgeOptions },
  { id: 'e-dispatch-style', source: 'dispatch', target: 'run_style', ...defaultEdgeOptions },
  { id: 'e-syntax-summarize', source: 'run_syntax', target: 'summarize', ...defaultEdgeOptions },
  { id: 'e-security-summarize', source: 'run_security', target: 'summarize', ...defaultEdgeOptions },
  { id: 'e-style-summarize', source: 'run_style', target: 'summarize', ...defaultEdgeOptions },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // 新增：保存用户选择的文件
  const fileInputRef = useRef(null);

  const resetGraph = () => {
    setNodes((nds) => nds.map(n => ({ ...n, style: { ...n.style, border: '2px solid #d1d5db', background: '#fff', fontWeight: 'normal' } })));
    setEdges((eds) => eds.map(e => ({ ...e, style: { ...e.style, stroke: '#d1d5db', strokeWidth: 2 } })));
  };

  const setNodeStatus = (nodeId, status) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        if (status === 'running') return { ...node, style: { ...node.style, border: '3px solid #3b82f6', background: '#eff6ff', fontWeight: 'bold' } };
        if (status === 'done') return { ...node, style: { ...node.style, border: '3px solid #10b981', background: '#ecfdf5', fontWeight: 'normal' } };
      }
      return node;
    }));
  };

  const highlightEdges = (source, targets) => {
    const edgeIds = targets.map(t => `e-${source}-${t}`);
    setEdges((eds) => eds.map((e) => {
      if (edgeIds.includes(e.id)) {
        return { ...e, style: { ...e.style, stroke: '#3b82f6', strokeWidth: 3 } };
      }
      return e;
    }));
  };

  // 步骤 1：选择文件（不直接执行审查）
  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setReport(null); // 清空之前的报告
    }
  };

  // 步骤 2：点击开始审查按钮
  const startReview = () => {
    if (!selectedFile) return alert("请先选择一个 .py 文件");

    setRunning(true);
    resetGraph();
    setReport(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const codeText = event.target.result;
      const ws = new WebSocket('ws://localhost:8000/ws/review');

      ws.onopen = () => ws.send(JSON.stringify({ code: codeText }));

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'node_start') {
          if (['run_syntax', 'run_security', 'run_style'].includes(msg.node) && !nodes.find(n => n.id === 'dispatch').style.border.includes('3px')) {
            setNodeStatus('dispatch', 'running');
            highlightEdges('dispatch', ['run_syntax', 'run_security', 'run_style']);
            setTimeout(() => setNodeStatus('dispatch', 'done'), 500);
          }
          setNodeStatus(msg.node, 'running');
        }

        if (msg.type === 'node_done') {
          setNodeStatus(msg.node, 'done');
          if (['run_syntax', 'run_security', 'run_style'].includes(msg.node)) {
            highlightEdges(msg.node, ['summarize']);
          }
          if (msg.node === 'summarize' && msg.final_report) {
            console.log("收到报告数据:", msg.final_report);
            setReport(msg.final_report);
          }
        }

        if (msg.type === 'done') {
          setRunning(false);
          if (msg.final_report) {
            console.log("✅ 拿到最终报告：", msg.final_report);
            setReport(String(msg.final_report));
          }
          ws.close();
        }

        if (msg.type === 'error') {
          alert("后端错误: " + msg.message);
          setRunning(false);
          ws.close();
        }
      };
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, fontFamily: 'sans-serif' }}>

      {/* 左侧控制台 */}
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', background: '#f9fafb', zIndex: 10, boxShadow: '2px 0 8px rgba(0,0,0,0.05)' }}>

        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>多 Agent 审查控制台</h2>

          <input
            type="file"
            accept=".py"
            ref={fileInputRef}
            onChange={handleSelectFile} // 只选择，不运行
            style={{ display: 'none' }}
          />

          {/* 显示当前选中的文件名，并提供一个“重新选择”的便捷按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', padding: '10px', background: '#f3f4f6', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
            <span style={{ flex: 1, fontSize: '14px', color: selectedFile ? '#374151' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile ? `📄 ${selectedFile.name}` : '尚未选择文件'}
            </span>
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={running}
              style={{ marginLeft: '10px', padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: running ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
              选择文件
            </button>
          </div>

          {/* 独立的开始审查按钮 */}
          <button
            onClick={startReview}
            disabled={running || !selectedFile}
            style={{
              padding: '12px',
              width: '100%',
              background: (running || !selectedFile) ? '#9ca3af' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: (running || !selectedFile) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
            {running ? '审查中，请稍候...' : '▶ 开始审查'}
          </button>

        </div>

        {/* 结果展示区 */}
        {report && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>📄 审查报告</h3>
            <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#374151', marginTop: '12px' }}>
              {report}
            </div>
          </div>
        )}
      </div>

      {/* 右侧画布 */}
      <div style={{ flex: 1, height: '100%' }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
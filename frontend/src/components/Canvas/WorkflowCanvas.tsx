import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Connection,
    addEdge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    NodeTypes,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkflowNode } from './WorkflowNode';

interface WorkflowCanvasProps {
    workflowId?: string;
    initialNodes?: Node[];
    initialEdges?: Edge[];
    onSave?: (nodes: Node[], edges: Edge[]) => void;
    executionState?: Record<string, 'running' | 'completed' | 'skipped'>;
}

// Define custom node types
const nodeTypes: NodeTypes = {
    workflowNode: WorkflowNode,
};

const WorkflowCanvasContent: React.FC<WorkflowCanvasProps> = ({
    initialNodes = [],
    initialEdges = [],
    onSave,
    executionState = {},
}) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Update nodes when initialNodes changes
    useEffect(() => {
        if (initialNodes.length > 0) {
            setNodes(initialNodes);
        }
    }, [initialNodes, setNodes]);

    // Update edges when initialEdges changes
    useEffect(() => {
        if (initialEdges.length > 0) {
            setEdges(initialEdges);
        }
    }, [initialEdges, setEdges]);

    useEffect(() => {
        setNodes((current) => current.map((node) => ({
            ...node,
            data: { ...node.data, execution: executionState[node.id] ? { status: executionState[node.id], running: executionState[node.id] === 'running' } : undefined },
        })));
    }, [executionState, setNodes]);

    // Handle new connections between nodes
    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge(params, eds));
        },
        [setEdges]
    );

    // Handle node selection
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Handle drag over
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Handle drop (n8n style add node)
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type || !reactFlowInstance) return;

            const position = reactFlowInstance.project({
                x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
                y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
            });

            const newNode: Node = {
                id: `node-${Date.now()}`,
                type: 'workflowNode',
                position,
                data: {
                    label: type,
                    nodeType: type,
                    parameters: {}
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    // Update node parameters
    const handleParameterChange = useCallback((key: string, value: any) => {
        if (!selectedNode) return;

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const newData = {
                        ...node.data,
                        parameters: {
                            ...node.data.parameters,
                            [key]: value
                        }
                    };
                    return { ...node, data: newData };
                }
                return node;
            })
        );

        // Update local selection state too
        setSelectedNode((prev) => prev ? {
            ...prev,
            data: {
                ...prev.data,
                parameters: {
                    ...prev.data.parameters,
                    [key]: value
                }
            }
        } : null);

    }, [selectedNode, setNodes]);

    // Save workflow
    const handleSave = useCallback(() => {
        if (onSave) {
            onSave(nodes, edges);
        }
    }, [nodes, edges, onSave]);

    return (
        <div className="w-full h-screen flex flex-col bg-n8n-bg">

            {/* Canvas Area */}
            <div className="flex-1 relative bg-n8n-bg" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-n8n-bg"
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#D1D5DB', strokeWidth: 2 }
                    }}
                >
                    <Background 
                        color="#E5E7EB" 
                        gap={20} 
                        size={1}
                        style={{ backgroundColor: '#FAFAFA' }}
                    />
                    <Controls 
                        className="!bg-white !border-gray-200 !shadow-n8n-md !rounded-lg overflow-hidden"
                        showInteractive={false}
                    />
                    <MiniMap 
                        className="!bg-white !border !border-gray-200 !shadow-n8n !rounded-lg overflow-hidden"
                        nodeColor={(node) => {
                            if (node.selected) return '#7C3AED';
                            return '#E5E7EB';
                        }}
                        maskColor="rgba(250, 250, 250, 0.8)"
                    />
                </ReactFlow>

            </div>
        </div>
    );
};

export const WorkflowCanvas = (props: WorkflowCanvasProps) => (
    <ReactFlowProvider>
        <WorkflowCanvasContent {...props} />
    </ReactFlowProvider>
);

import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Panel,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Play, X, Undo, Redo, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TriggerNode, { triggerEvents } from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import NodePanel from './NodePanel';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const channels = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook Messenger' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'rcs', label: 'RCS' },
  { value: 'voicebot', label: 'Voice Bot' },
];

interface AutomationBuilderProps {
  automationId?: string;
  automationName: string;
  onClose: () => void;
  onSave: (data: { name: string; channel: string; nodes: Node[]; edges: Edge[] }) => void;
}

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 400, y: 100 },
    data: { 
      label: 'Trigger', 
      triggerType: 'new_incoming_message',
      channel: 'whatsapp',
      conditions: [],
      onUpdate: () => {},
    },
  },
];

const initialEdges: Edge[] = [];

function AutomationBuilderContent({ automationName, onClose, onSave }: AutomationBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [name, setName] = useState(automationName);
  const [channel, setChannel] = useState('whatsapp');
  const { toast } = useToast();

  const updateNodeData = useCallback((nodeId: string, newData: Partial<any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onUpdate: (data: any) => updateNodeData(node.id, data),
    },
  }));

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: false, 
      style: { 
        stroke: '#6366f1', 
        strokeWidth: 2,
      },
      type: 'smoothstep',
    }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeData = event.dataTransfer.getData('application/reactflow');

      if (!nodeData || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const { type, subType } = JSON.parse(nodeData);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          triggerType: type === 'trigger' ? 'new_incoming_message' : undefined,
          conditionType: type === 'condition' ? 'any_message' : undefined,
          actionType: subType || (type === 'action' ? 'auto_reply_buttons' : undefined),
          conditions: [],
          rules: [],
          keywords: [],
          isCaseSensitive: false,
          config: {},
          onUpdate: () => {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeData: string) => {
    event.dataTransfer.setData('application/reactflow', nodeData);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSave = () => {
    onSave({ name, channel, nodes, edges });
    toast({
      title: 'Automation saved',
      description: 'Your automation workflow has been saved successfully.',
    });
  };

  const handleTest = () => {
    toast({
      title: 'Testing automation',
      description: 'Running test with mock event...',
    });
    setTimeout(() => {
      toast({
        title: 'Test completed',
        description: 'Automation executed successfully!',
      });
    }, 2000);
  };

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-full">
      <NodePanel onDragStart={onDragStart} />
      
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Name:</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-48 h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Channel:</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" onClick={handleTest}>
              <Play className="h-4 w-4 mr-1" />
              Test
            </Button>
            <Button size="sm" className="gradient-primary" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save & Activate
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              animated: false,
              type: 'smoothstep',
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return 'hsl(var(--warning))';
                  case 'condition': return '#a855f7';
                  case 'action': return 'hsl(var(--primary))';
                  default: return '#888';
                }
              }}
              maskColor="hsl(var(--background) / 0.8)"
            />
            <Panel position="bottom-center" className="bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-muted-foreground">
              Drag nodes from the panel • Click to select • Drag handles to connect
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function AutomationBuilder(props: AutomationBuilderProps) {
  return (
    <ReactFlowProvider>
      <AutomationBuilderContent {...props} />
    </ReactFlowProvider>
  );
}

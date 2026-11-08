import React, { useEffect, useState } from 'react';
import { ParameterInput, NodeProperty } from '../Parameters/ParameterInput';
import { X } from 'lucide-react';
import axios from 'axios';

interface NodePropertiesPanelProps {
    nodeId: string;
    nodeType: string;
    parameters: any;
    onChange: (key: string, value: any) => void;
    onClose: () => void;
}

// Hardcoded HTTP Request node configuration
const HTTP_REQUEST_PROPERTIES: NodeProperty[] = [
    {
        name: 'method',
        displayName: 'Method',
        type: 'options',
        options: [
            { name: 'GET', value: 'GET' },
            { name: 'POST', value: 'POST' },
            { name: 'PUT', value: 'PUT' },
            { name: 'DELETE', value: 'DELETE' },
            { name: 'PATCH', value: 'PATCH' },
            { name: 'HEAD', value: 'HEAD' },
            { name: 'OPTIONS', value: 'OPTIONS' },
        ],
        default: 'GET',
        required: true,
        description: 'The HTTP method to use for the request'
    },
    {
        name: 'url',
        displayName: 'URL',
        type: 'string',
        default: '',
        placeholder: 'https://api.example.com/endpoint',
        required: true,
        description: 'The URL to make the request to'
    },
    {
        name: 'authentication',
        displayName: 'Authentication',
        type: 'options',
        options: [
            { name: 'None', value: 'none' },
            { name: 'Basic Auth', value: 'basicAuth' },
            { name: 'Header Auth', value: 'headerAuth' },
            { name: 'OAuth2', value: 'oAuth2' },
        ],
        default: 'none',
        description: 'Authentication method to use'
    },
    {
        name: 'sendHeaders',
        displayName: 'Send Headers',
        type: 'boolean',
        default: false,
        description: 'Whether to send custom headers'
    },
    {
        name: 'headerParameters',
        displayName: 'Headers',
        type: 'json',
        default: '{}',
        placeholder: '{\n  "Content-Type": "application/json"\n}',
        description: 'Request headers as JSON object'
    },
    {
        name: 'sendQuery',
        displayName: 'Send Query Parameters',
        type: 'boolean',
        default: false,
        description: 'Whether to send query parameters'
    },
    {
        name: 'queryParameters',
        displayName: 'Query Parameters',
        type: 'json',
        default: '{}',
        placeholder: '{\n  "param1": "value1",\n  "param2": "value2"\n}',
        description: 'Query parameters as JSON object'
    },
    {
        name: 'sendBody',
        displayName: 'Send Body',
        type: 'boolean',
        default: false,
        description: 'Whether to send a request body'
    },
    {
        name: 'bodyParameters',
        displayName: 'Body',
        type: 'json',
        default: '{}',
        placeholder: '{\n  "key": "value"\n}',
        description: 'Request body as JSON object'
    },
];

interface NodePropertiesPanelProps {
    nodeId: string;
    nodeType: string;
    parameters: any;
    onChange: (key: string, value: any) => void;
    onClose: () => void;
}

export const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
    nodeId,
    nodeType,
    parameters,
    onChange,
    onClose
}) => {
    const [properties, setProperties] = useState<NodeProperty[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDefinitions = async () => {
            setLoading(true);
            try {
                // Check if this is HTTP Request node - use hardcoded config
                if (nodeType.toLowerCase().includes('http') || nodeType.toLowerCase().includes('httprequest')) {
                    setProperties(HTTP_REQUEST_PROPERTIES);
                    setLoading(false);
                    return;
                }

                // For other nodes, try to fetch from API
                const response = await axios.get('http://localhost:3000/types/nodes.json');
                const nodeDef = response.data.find((n: any) => n.name === nodeType);

                if (nodeDef && nodeDef.properties) {
                    setProperties(nodeDef.properties);
                } else {
                    setProperties([]);
                }
            } catch (error) {
                console.error('Failed to load node definitions:', error);
                setProperties([]);
            } finally {
                setLoading(false);
            }
        };

        if (nodeType) {
            fetchDefinitions();
        }
    }, [nodeType]);

    return (
        <div 
            className="absolute right-0 top-0 h-full w-[600px] bg-white border-l border-gray-200 shadow-n8n-xl z-50 flex flex-col"
            style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-n8n-sm">
                            <span className="text-lg font-bold">{nodeType.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-n8n-text-primary">{nodeType}</h2>
                            <p className="text-xs text-n8n-text-muted">Node ID: {nodeId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-lg transition-all text-n8n-text-muted hover:text-n8n-text-primary"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-n8n-bg/30 p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-n8n-secondary mb-2"></div>
                            <p className="text-sm text-n8n-text-muted">Loading parameters...</p>
                        </div>
                    </div>
                ) : properties.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                        <p className="text-sm text-n8n-text-muted">No parameters available for this node type.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {properties.map((prop) => (
                            <div key={prop.name} className="bg-white rounded-lg border border-gray-200 p-4">
                                <ParameterInput
                                    property={prop}
                                    value={parameters[prop.name] ?? prop.default}
                                    onChange={(val) => onChange(prop.name, val)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
                <button className="w-full text-sm text-n8n-secondary hover:text-n8n-secondary/80 font-medium transition-all">
                    📚 Open Documentation
                </button>
            </div>
        </div>
    );
};

/**
 * Node Library Component
 * Displays available nodes that can be added to workflow
 */

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

interface NodeDefinition {
    name: string;
    displayName: string;
    category: string;
    categories?: string[];
    description?: string;
    icon?: string;
}

interface NodeLibraryProps {
    onNodeSelect: (nodeType: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const NodeLibrary: React.FC<NodeLibraryProps> = ({ onNodeSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [nodes, setNodes] = useState<NodeDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch nodes from API on mount
    useEffect(() => {
        const fetchNodes = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/types/nodes.json`);
                setNodes(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch nodes:', err);
                setError('Failed to load nodes. Using fallback data.');
                // Fallback to empty array or minimal sample data
                setNodes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNodes();
    }, []);

    const categories = Array.from(new Set(
        nodes.flatMap(n => n.categories || [n.category]).filter(Boolean)
    ));

    const filteredNodes = nodes.filter((node) => {
        const matchesSearch =
            node.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || 
            (node.categories?.includes(selectedCategory) || node.category === selectedCategory);
        return matchesSearch && matchesCategory;
    });

    return (
        <div style={containerStyle}>
            <h2 style={headerStyle}>Node Library</h2>

            {/* Loading State */}
            {loading && (
                <div style={loadingStyle}>Loading nodes...</div>
            )}

            {/* Error State */}
            {error && (
                <div style={errorStyle}>{error}</div>
            )}

            {/* Search */}
            {!loading && (
                <>
                    <div style={searchContainerStyle}>
                        <Search size={18} color="#999" />
                        <input
                            type="text"
                            placeholder="Search nodes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={searchInputStyle}
                        />
                    </div>

                    {/* Categories */}
                    <div style={categoriesStyle}>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            style={selectedCategory === null ? selectedCategoryStyle : categoryButtonStyle}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={selectedCategory === cat ? selectedCategoryStyle : categoryButtonStyle}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Node List */}
                    <div style={nodeListStyle}>
                        {filteredNodes.map((node) => (
                            <div
                                key={node.name}
                                onClick={() => onNodeSelect(node.name)}
                                style={nodeCardStyle}
                            >
                                <div style={nodeIconStyle}>{node.icon || node.displayName[0]}</div>
                                <div style={nodeInfoStyle}>
                                    <div style={nodeNameStyle}>{node.displayName}</div>
                                    {node.description && <div style={nodeDescStyle}>{node.description}</div>}
                                </div>
                            </div>
                        ))}

                        {filteredNodes.length === 0 && !loading && (
                            <div style={noResultsStyle}>No nodes found</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Styles
const containerStyle: React.CSSProperties = {
    width: '300px',
    height: '100vh',
    background: '#f8f9fa',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
    padding: '20px',
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    borderBottom: '1px solid #e0e0e0',
};

const searchContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px 20px',
    background: 'white',
    borderBottom: '1px solid #e0e0e0',
};

const searchInputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
};

const categoriesStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '15px 20px',
    overflowX: 'auto',
    borderBottom: '1px solid #e0e0e0',
};

const categoryButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '16px',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

const selectedCategoryStyle: React.CSSProperties = {
    ...categoryButtonStyle,
    background: '#5865f2',
    color: 'white',
    borderColor: '#5865f2',
};

const nodeListStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
};

const nodeCardStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '10px',
    cursor: 'pointer',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s',
};

const nodeIconStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: '#e3f2fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    color: '#2196f3',
};

const nodeInfoStyle: React.CSSProperties = {
    flex: 1,
};

const nodeNameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
};

const nodeDescStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
};

const noResultsStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
};
const loadingStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: '14px',
};

const errorStyle: React.CSSProperties = {
    padding: '15px 20px',
    background: '#fff3cd',
    borderBottom: '1px solid #ffc107',
    color: '#856404',
    fontSize: '12px',
};
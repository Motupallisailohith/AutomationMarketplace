package nodes

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
)

// NodeRegistryPorted mirrors n8n's DirectoryLoader logic
type NodeRegistry struct {
	Nodes map[string]NodeMetadata
}

type NodeMetadata struct {
	Name        string         `json:"name"`
	DisplayName string         `json:"displayName"`
	Description string         `json:"description"`
	Icon        string         `json:"icon"`
	Type        string         `json:"type"`
	Properties  []NodeProperty `json:"properties"`
}

type NodeProperty struct {
	Name        string           `json:"name"`
	DisplayName string           `json:"displayName"`
	Type        string           `json:"type"`
	Default     interface{}      `json:"default"`
	Description string           `json:"description"`
	Options     []PropertyOption `json:"options,omitempty"`
}

type PropertyOption struct {
	Name  string      `json:"name"`
	Value interface{} `json:"value"`
}

func NewNodeRegistry() *NodeRegistry {
	return &NodeRegistry{
		Nodes: make(map[string]NodeMetadata),
	}
}

// LoadNodesFromDirectory scans a directory for n8n-style node metadata
func (r *NodeRegistry) LoadNodesFromDirectory(dirPath string) error {
	return filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Porting logic: Look for .json definition files (in our stack, we'll use n8n's distilled metadata)
		if !d.IsDir() && filepath.Ext(path) == ".json" && !isIgnored(path) {
			data, err := os.ReadFile(path)
			if err != nil {
				return nil // Skip files we can't read
			}

			var meta NodeMetadata
			if err := json.Unmarshal(data, &meta); err == nil && meta.Name != "" {
				r.Nodes[meta.Name] = meta
			}
		}
		return nil
	})
}

func isIgnored(path string) bool {
	ignored := []string{"package.json", "tsconfig.json"}
	for _, i := range ignored {
		if filepath.Base(path) == i {
			return true
		}
	}
	return false
}

func (r *NodeRegistry) GetNodeMetadata(nodeType string) (*NodeMetadata, bool) {
	meta, ok := r.Nodes[nodeType]
	return &meta, ok
}

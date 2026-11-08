package engine

import (
	"automation-marketplace/orchestrator-go/internal/workflows"
)

// ExecutionGraph represents the workflow as a graph for execution
type ExecutionGraph struct {
	Nodes                   map[string]workflows.NodeDefinition
	ConnectionsBySource     map[string]map[string][][]ConnectionTarget
	ConnectionsByTarget     map[string]map[string][][]ConnectionSource
	ExecutionOrder          []string
}

type ConnectionTarget struct {
	Node  string
	Input int
}

type ConnectionSource struct {
	Node   string
	Output int
}

// NewExecutionGraph builds a graph from n8n-style workflow definition
func NewExecutionGraph(def workflows.WorkflowDefinition) *ExecutionGraph {
	g := &ExecutionGraph{
		Nodes:               make(map[string]workflows.NodeDefinition),
		ConnectionsBySource: make(map[string]map[string][][]ConnectionTarget),
		ConnectionsByTarget: make(map[string]map[string][][]ConnectionSource),
	}

	for _, node := range def.Nodes {
		g.Nodes[node.ID] = node
	}

	// Porting n8n's mapConnectionsByDestination logic
	for _, conn := range def.Connections {
		// Source -> Target
		if g.ConnectionsBySource[conn.SourceNode] == nil {
			g.ConnectionsBySource[conn.SourceNode] = make(map[string][][]ConnectionTarget)
		}
		// n8n connection types (main, error, etc.)
		typeKey := conn.SourceOutput // Usually "main"
		if typeKey == "" {
			typeKey = "main"
		}
		
		// Ensure output array is large enough
		// We'll simplify n8n's multi-output indices for now but keep the structure
		if g.ConnectionsBySource[conn.SourceNode][typeKey] == nil {
			g.ConnectionsBySource[conn.SourceNode][typeKey] = [][]ConnectionTarget{{}}
		}
		
		g.ConnectionsBySource[conn.SourceNode][typeKey][0] = append(
			g.ConnectionsBySource[conn.SourceNode][typeKey][0], 
			ConnectionTarget{Node: conn.TargetNode, Input: 0},
		)

		// Target -> Source (Destination Map)
		if g.ConnectionsByTarget[conn.TargetNode] == nil {
			g.ConnectionsByTarget[conn.TargetNode] = make(map[string][][]ConnectionSource)
		}
		
		targetType := conn.TargetInput
		if targetType == "" {
			targetType = "main"
		}

		if g.ConnectionsByTarget[conn.TargetNode][targetType] == nil {
			g.ConnectionsByTarget[conn.TargetNode][targetType] = [][]ConnectionSource{{}}
		}

		g.ConnectionsByTarget[conn.TargetNode][targetType][0] = append(
			g.ConnectionsByTarget[conn.TargetNode][targetType][0],
			ConnectionSource{Node: conn.SourceNode, Output: 0},
		)
	}

	g.ExecutionOrder = g.calculateExecutionOrder()
	return g
}

// calculateExecutionOrder implements a topological sort similar to n8n's execution ordering
func (g *ExecutionGraph) calculateExecutionOrder() []string {
	visited := make(map[string]bool)
	temp := make(map[string]bool)
	order := []string{}

	var visit func(nodeID string)
	visit = func(nodeID string) {
		if temp[nodeID] {
			return // Cycle detected or already in progress
		}
		if visited[nodeID] {
			return
		}

		temp[nodeID] = true

		// Visit parents first (nodes required for this node to run)
		if targets, ok := g.ConnectionsByTarget[nodeID]; ok {
			for _, outputList := range targets["main"] {
				for _, source := range outputList {
					visit(source.Node)
				}
			}
		}

		delete(temp, nodeID)
		visited[nodeID] = true
		order = append(order, nodeID)
	}

	// Find starting nodes (triggers or nodes with no inputs)
	for nodeID := range g.Nodes {
		hasInput := false
		if targets, ok := g.ConnectionsByTarget[nodeID]; ok {
			if len(targets["main"]) > 0 {
				hasInput = true
			}
		}
		if !hasInput {
			visit(nodeID)
		}
	}

	// Visit remaining nodes just in case
	for nodeID := range g.Nodes {
		if !visited[nodeID] {
			visit(nodeID)
		}
	}

	return order
}
